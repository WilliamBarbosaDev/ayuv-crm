import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = process.env.PORT || 3001;

const API_KEY = process.env.API_KEY || 'MINHA_CHAVE_SECRETA';

app.use(cors());
app.use(express.json());

// Auth middleware for API routes
app.use('/api', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

let db;

async function setupDatabase() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE,
      name TEXT,
      status TEXT,
      last_message TEXT,
      remoteJid TEXT,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Database initialized successfully.');
  
  // Try to add new columns if they don't exist (SQLite doesn't have IF NOT EXISTS for columns)
  try { await db.exec('ALTER TABLE leads ADD COLUMN remoteJid TEXT'); } catch(e) {}
  try { await db.exec('ALTER TABLE leads ADD COLUMN source TEXT'); } catch(e) {}
}

setupDatabase().catch(err => {
  console.error('Error starting database:', err);
});

// GET /api/leads - List all leads or filter by phone
app.get('/api/leads', async (req, res) => {
  try {
    const { phone } = req.query;
    if (phone) {
      const lead = await db.get('SELECT * FROM leads WHERE phone = ?', phone);
      if (!lead) return res.json({ found: false, lead: null });
      return res.json({ found: true, lead });
    }
    const leads = await db.all('SELECT * FROM leads ORDER BY updated_at DESC');
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads - Create new lead
app.post('/api/leads', async (req, res) => {
  try {
    const { phone, name, status = 'novo_lead', last_message = '', remoteJid = '', source = 'whatsapp' } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone is required' });
    }

    const existingLead = await db.get('SELECT * FROM leads WHERE phone = ?', phone);
    if (existingLead) {
      return res.status(200).json(existingLead); // return existing lead if duplicate phone
    }

    const id = uuidv4();
    const created_at = new Date().toISOString();
    const updated_at = created_at;

    await db.run(
      `INSERT INTO leads (id, phone, name, status, last_message, remoteJid, source, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, phone, name || '', status, last_message, remoteJid, source, created_at, updated_at]
    );

    const lead = await db.get('SELECT * FROM leads WHERE id = ?', id);
    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id - Update lead
app.put('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, name, last_message } = req.body;
    
    const existingLead = await db.get('SELECT * FROM leads WHERE id = ?', id);
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updatedStatus = status || existingLead.status;
    const updatedName = name || existingLead.name;
    const updatedMessage = last_message !== undefined ? last_message : existingLead.last_message;
    const updated_at = new Date().toISOString();

    await db.run(
      `UPDATE leads 
       SET status = ?, name = ?, last_message = ?, updated_at = ? 
       WHERE id = ?`,
      [updatedStatus, updatedName, updatedMessage, updated_at, id]
    );

    const lead = await db.get('SELECT * FROM leads WHERE id = ?', id);
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`CRM API running on http://localhost:${port}`);
});
