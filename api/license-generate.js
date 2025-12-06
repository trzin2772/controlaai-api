import { MongoClient } from 'mongodb';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { email, nome, adminKey } = req.body;
  
  if (!adminKey || adminKey !== 'controlaai-admin-2025-secret-key') {
    return res.status(401).json({ success: false, message: 'Invalid admin key' });
  }
  if (!email || !nome) {
    return res.status(400).json({ success: false, message: 'Email and name required' });
  }

  try {
    const licenseKey = crypto.randomBytes(16).toString('hex')
      .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('controlaai');
    const licenses = db.collection('licenses');

    const existing = await licenses.findOne({ email });
    if (existing) {
      await client.close();
      return res.json({ success: false, message: 'License exists', existingKey: existing.licenseKey });
    }

    const license = {
      licenseKey,
      email,
      customerName: nome,
      productName: 'ControlaAI',
      createdAt: new Date(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'active',
      activated: false,
      devices: [],
      transactions: []
    };

    await licenses.insertOne(license);
    await client.close();

    return res.json({
      success: true,
      licenseKey,
      email,
      customerName: nome,
      expirationDate: license.expirationDate.toISOString()
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
