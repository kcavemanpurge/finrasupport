import express from 'express';
import cors from 'cors';
import { db } from '../../db/index.js';
import { threads, messages } from '../../db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory fallback and seed cache
const inMemoryStore = {
  threads: new Map(),
  messages: new Map(),
  nextMsgId: 1000
};

// Initial Seed Data for Demo & Immediate Functionality
const SEED_THREADS = [
  {
    id: 'client_78a1bc',
    clientName: 'Katherine Vance (Vance Capital Partners)',
    status: 'waiting_specialist',
    mode: 'specialist',
    lastMessageText: 'Can you verify the HSM key generation standards for our institutional root CA?',
    messageCount: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    lastUpdated: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    seedMessages: [
      { sender: 'user', text: 'Hello, we require assistance with institutional Certificate Authority deployment.' },
      { sender: 'bot', text: 'Welcome to Primero Srv LLC. Our CA Certification practice deploys root-to-leaf X.509 PKI trust chains and Hardware Security Modules (HSM).' },
      { sender: 'user', text: 'Can you verify the HSM key generation standards for our institutional root CA?' }
    ]
  },
  {
    id: 'client_94f2cd',
    clientName: 'David Chen (Apex Trade Desks)',
    status: 'active',
    mode: 'bot',
    lastMessageText: 'What is the clearinghouse coordination timeline for introducing broker setups?',
    messageCount: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    lastUpdated: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    seedMessages: [
      { sender: 'user', text: 'Inquiring regarding independent broker matching and introducing broker (IB) frameworks.' },
      { sender: 'bot', text: 'Primero Srv provides specialized trade desk architecture, introducing broker compliance, and clearinghouse matching for capital markets.' }
    ]
  },
  {
    id: 'client_b12e44',
    clientName: 'Elena Rostova (Compliance Director)',
    status: 'resolved',
    mode: 'specialist',
    lastMessageText: 'Understood, we accessed the consolidated FINRA rulebook from the header link. Thank you.',
    messageCount: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    seedMessages: [
      { sender: 'user', text: 'Where can we verify Series 24 qualification exam requirements?' },
      { sender: 'bot', text: 'Our header navigation links directly to official FINRA qualification exams and FINRA Gateway.' },
      { sender: 'admin', text: 'Elena, you can also view BrokerCheck and the statutory rulebooks in the top bar of our site.' },
      { sender: 'user', text: 'Understood, we accessed the consolidated FINRA rulebook from the header link. Thank you.' }
    ]
  }
];

function initSeedInMemory() {
  for (const t of SEED_THREADS) {
    if (!inMemoryStore.threads.has(t.id)) {
      inMemoryStore.threads.set(t.id, {
        id: t.id,
        clientName: t.clientName,
        status: t.status,
        mode: t.mode,
        lastMessageText: t.lastMessageText,
        messageCount: t.messageCount,
        createdAt: t.createdAt,
        lastUpdated: t.lastUpdated
      });
      const msgs = [];
      let baseTime = new Date(t.createdAt).getTime();
      for (const m of t.seedMessages) {
        baseTime += 1000 * 60 * 5;
        msgs.push({
          id: inMemoryStore.nextMsgId++,
          threadId: t.id,
          sender: m.sender,
          text: m.text,
          timestamp: new Date(baseTime).toISOString()
        });
      }
      inMemoryStore.messages.set(t.id, msgs);
    }
  }
}
initSeedInMemory();

// Database initialization & sync helper
let dbReady = false;
async function syncDb() {
  if (dbReady) return true;
  try {
    const existing = await db.select().from(threads).limit(1);
    if (existing.length === 0) {
      for (const t of SEED_THREADS) {
        await db.insert(threads).values({
          id: t.id,
          clientName: t.clientName,
          status: t.status,
          mode: t.mode,
          lastMessageText: t.lastMessageText,
          messageCount: t.messageCount,
          createdAt: new Date(t.createdAt),
          lastUpdated: new Date(t.lastUpdated)
        });
        let baseTime = new Date(t.createdAt).getTime();
        for (const m of t.seedMessages) {
          baseTime += 1000 * 60 * 5;
          await db.insert(messages).values({
            threadId: t.id,
            sender: m.sender,
            text: m.text,
            timestamp: new Date(baseTime)
          });
        }
      }
    }
    dbReady = true;
    return true;
  } catch (err) {
    // Database connection may not be ready in local/dry-run environments
    return false;
  }
}

// Health & System status
app.get('/api/status', async (req, res) => {
  const isDb = await syncDb();
  res.json({
    status: 'success',
    daemon: 'ONLINE // US-EAST-2',
    database: isDb ? 'CONNECTED (Postgres)' : 'STANDALONE_FALLBACK',
    timestamp: new Date().toISOString(),
    version: '1.2.0-sovereign'
  });
});

// Admin: Get all threads
app.get('/api/admin/threads', async (req, res) => {
  try {
    const isDb = await syncDb();
    if (isDb) {
      const all = await db.select().from(threads).orderBy(desc(threads.lastUpdated));
      return res.json({
        status: 'success',
        threads: all.map(t => ({
          id: t.id,
          clientName: t.clientName,
          status: t.status,
          mode: t.mode,
          lastMessageText: t.lastMessageText || '',
          messageCount: t.messageCount,
          createdAt: t.createdAt.toISOString(),
          lastUpdated: t.lastUpdated.toISOString()
        }))
      });
    }
  } catch (e) {
    console.warn('DB fetch error, falling back to memory:', e.message);
  }

  const list = Array.from(inMemoryStore.threads.values()).sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );
  res.json({ status: 'success', threads: list });
});

// Admin: Get thread messages
app.get('/api/admin/thread/:clientId', async (req, res) => {
  const { clientId } = req.params;
  try {
    const isDb = await syncDb();
    if (isDb) {
      const msgs = await db.select().from(messages).where(eq(messages.threadId, clientId)).orderBy(asc(messages.timestamp));
      return res.json({
        status: 'success',
        messages: msgs.map(m => ({
          id: m.id,
          threadId: m.threadId,
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp.toISOString()
        }))
      });
    }
  } catch (e) {
    console.warn('DB msg fetch error, falling back:', e.message);
  }

  const msgs = inMemoryStore.messages.get(clientId) || [];
  res.json({ status: 'success', messages: msgs });
});

// Admin: Dispatch reply
app.post('/api/admin/reply', async (req, res) => {
  const { clientId, text } = req.body;
  if (!clientId || !text) {
    return res.status(400).json({ status: 'error', message: 'Missing clientId or text' });
  }

  const now = new Date();
  let savedMsg = null;

  try {
    const isDb = await syncDb();
    if (isDb) {
      const [inserted] = await db.insert(messages).values({
        threadId: clientId,
        sender: 'admin',
        text: text,
        timestamp: now
      }).returning();

      await db.update(threads).set({
        status: 'active',
        lastMessageText: text,
        lastUpdated: now
      }).where(eq(threads.id, clientId));

      savedMsg = inserted;
    }
  } catch (e) {
    console.warn('DB reply error, falling back:', e.message);
  }

  // Update in-memory
  const th = inMemoryStore.threads.get(clientId);
  if (th) {
    th.lastMessageText = text;
    th.status = 'active';
    th.lastUpdated = now.toISOString();
    th.messageCount = (th.messageCount || 0) + 1;
  }
  const msgObj = {
    id: savedMsg ? savedMsg.id : inMemoryStore.nextMsgId++,
    threadId: clientId,
    sender: 'admin',
    text: text,
    timestamp: now.toISOString()
  };
  const list = inMemoryStore.messages.get(clientId) || [];
  list.push(msgObj);
  inMemoryStore.messages.set(clientId, list);

  res.json({ status: 'success', message: msgObj });
});

// Client: Get thread history
app.get('/api/chat/thread/:clientId', async (req, res) => {
  const { clientId } = req.params;
  try {
    const isDb = await syncDb();
    if (isDb) {
      const msgs = await db.select().from(messages).where(eq(messages.threadId, clientId)).orderBy(asc(messages.timestamp));
      return res.json({
        status: 'success',
        messages: msgs.map(m => ({
          id: m.id,
          threadId: m.threadId,
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp.toISOString()
        }))
      });
    }
  } catch (e) {
    console.warn('DB client fetch error:', e.message);
  }

  const msgs = inMemoryStore.messages.get(clientId) || [];
  res.json({ status: 'success', messages: msgs });
});

// Client: Post message
app.post('/api/chat/message', async (req, res) => {
  const { clientId, text, isSpecialistRequest } = req.body;
  if (!clientId || !text) {
    return res.status(400).json({ status: 'error', message: 'Missing parameters' });
  }

  const now = new Date();
  const threadStatus = isSpecialistRequest ? 'waiting_specialist' : 'active';
  const threadMode = isSpecialistRequest ? 'specialist' : 'bot';

  // Smart automated assistant response
  let botReplyText = null;
  const lower = text.toLowerCase();
  if (isSpecialistRequest) {
    botReplyText = 'Your message has been escalated to the Sovereign Admin Live Agent Chat Console. An advisory specialist is reviewing your session.';
  } else if (lower.includes('ca') || lower.includes('cert') || lower.includes('pki') || lower.includes('x.509')) {
    botReplyText = 'Primero Srv delivers sovereign Certificate Authority (CA) validation, root key issuance, and HSM lifecycle architecture. You can also submit the inquiry form on this page or escalate to a specialist.';
  } else if (lower.includes('broker') || lower.includes('clearing') || lower.includes('trade')) {
    botReplyText = 'Our certified broker provisions facilitate institutional dealer matching, introducing broker (IB) architectures, and trade desk compliance. Would you like to connect to a live specialist?';
  } else if (lower.includes('finra') || lower.includes('sec') || lower.includes('rule') || lower.includes('brokercheck')) {
    botReplyText = 'Official statutory channels (FINRA, BrokerCheck, SEC EDGAR, FINRA Gateway) are accessible directly via our top header links.';
  } else {
    botReplyText = 'Thank you for reaching out to Primero Srv LLC. Our client desk specializes in CA Certification and Broker Intermediary solutions.';
  }

  let userMsgId = inMemoryStore.nextMsgId++;
  let botMsgId = inMemoryStore.nextMsgId++;

  try {
    const isDb = await syncDb();
    if (isDb) {
      // Upsert thread
      const existing = await db.select().from(threads).where(eq(threads.id, clientId)).limit(1);
      if (existing.length === 0) {
        await db.insert(threads).values({
          id: clientId,
          clientName: 'Visitor (' + clientId.slice(-4) + ')',
          status: threadStatus,
          mode: threadMode,
          lastMessageText: text,
          messageCount: 1,
          createdAt: now,
          lastUpdated: now
        });
      } else {
        await db.update(threads).set({
          status: threadStatus,
          mode: threadMode,
          lastMessageText: text,
          lastUpdated: now
        }).where(eq(threads.id, clientId));
      }

      const [userMsg] = await db.insert(messages).values({
        threadId: clientId,
        sender: 'user',
        text: text,
        timestamp: now
      }).returning();
      userMsgId = userMsg.id;

      if (botReplyText) {
        const botTime = new Date(Date.now() + 400);
        const [botMsg] = await db.insert(messages).values({
          threadId: clientId,
          sender: isSpecialistRequest ? 'admin' : 'bot',
          text: botReplyText,
          timestamp: botTime
        }).returning();
        botMsgId = botMsg.id;
      }
    }
  } catch (e) {
    console.warn('DB chat message error:', e.message);
  }

  // Update in-memory
  if (!inMemoryStore.threads.has(clientId)) {
    inMemoryStore.threads.set(clientId, {
      id: clientId,
      clientName: 'Visitor (' + clientId.slice(-4) + ')',
      status: threadStatus,
      mode: threadMode,
      lastMessageText: text,
      messageCount: 1,
      createdAt: now.toISOString(),
      lastUpdated: now.toISOString()
    });
  } else {
    const t = inMemoryStore.threads.get(clientId);
    t.status = threadStatus;
    t.mode = threadMode;
    t.lastMessageText = text;
    t.lastUpdated = now.toISOString();
    t.messageCount = (t.messageCount || 0) + 1;
  }

  const threadMsgs = inMemoryStore.messages.get(clientId) || [];
  threadMsgs.push({
    id: userMsgId,
    threadId: clientId,
    sender: 'user',
    text: text,
    timestamp: now.toISOString()
  });

  let botReplyObj = null;
  if (botReplyText) {
    botReplyObj = {
      id: botMsgId,
      threadId: clientId,
      sender: isSpecialistRequest ? 'admin' : 'bot',
      text: botReplyText,
      timestamp: new Date(Date.now() + 400).toISOString()
    };
    threadMsgs.push(botReplyObj);
  }
  inMemoryStore.messages.set(clientId, threadMsgs);

  res.json({
    status: 'success',
    userMessageId: userMsgId,
    botReply: botReplyObj
  });
});

// Client: Escalation / Handoff
app.post('/api/chat/handoff', async (req, res) => {
  const { clientId } = req.body;
  if (!clientId) return res.status(400).json({ status: 'error', message: 'Missing clientId' });

  const now = new Date();
  const notice = 'You are now connected with the Primero Srv live specialist channel. A senior advisory consultant is reviewing your session in the Sovereign Admin Live Agent Chat Console.';

  let msgId = inMemoryStore.nextMsgId++;

  try {
    const isDb = await syncDb();
    if (isDb) {
      await db.update(threads).set({
        status: 'waiting_specialist',
        mode: 'specialist',
        lastUpdated: now
      }).where(eq(threads.id, clientId));

      const [inserted] = await db.insert(messages).values({
        threadId: clientId,
        sender: 'admin',
        text: notice,
        timestamp: now
      }).returning();
      msgId = inserted.id;
    }
  } catch (e) {
    console.warn('DB handoff error:', e.message);
  }

  const t = inMemoryStore.threads.get(clientId);
  if (t) {
    t.status = 'waiting_specialist';
    t.mode = 'specialist';
    t.lastUpdated = now.toISOString();
  }

  const list = inMemoryStore.messages.get(clientId) || [];
  list.push({
    id: msgId,
    threadId: clientId,
    sender: 'admin',
    text: notice,
    timestamp: now.toISOString()
  });
  inMemoryStore.messages.set(clientId, list);

  res.json({
    status: 'success',
    messageId: msgId,
    message: notice
  });
});

const PORT = process.env.PORT || 8889;
app.listen(PORT, () => {
  console.log(`[NETLIFY_SERVER] Sovereign backend running on port ${PORT}`);
});
