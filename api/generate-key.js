import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_KEY = process.env.ADMIN_KEY || 'controlaai-admin-2025-secret-key';

function gerarChaveLicenca() {
  // Gera uma chave UUID-like
  return crypto.randomBytes(16).toString('hex')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

async function handler(req, res) {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { email, nome, adminKey } = req.body;

    // Valida credenciais admin
    if (!adminKey || adminKey !== ADMIN_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Chave de admin inválida ou não fornecida'
      });
    }

    // Valida dados obrigatórios
    if (!email || !nome) {
      return res.status(400).json({
        success: false,
        message: 'Email e nome do cliente são obrigatórios'
      });
    }

    // Valida formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    // Gera chave
    const licenseKey = gerarChaveLicenca();

    // Conecta ao MongoDB
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('controlaai');
    const collection = db.collection('licenses');

    // Verifica se já existe licença para este email
    const existente = await collection.findOne({ email });
    if (existente) {
      await client.close();
      console.log('⚠️ Já existe licença para', email);
      return res.status(400).json({
        success: false,
        message: 'Já existe uma licença ativa para este email',
        existingKey: existente.licenseKey
      });
    }

    // Cria documento de licença
    const license = {
      licenseKey,
      email,
      customerName: nome,
      productName: 'ControlaAI',
      createdAt: new Date(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
      status: 'active',
      activated: false,
      devices: [],
      transactions: []
    };

    // Insere no MongoDB
    await collection.insertOne(license);
    await client.close();

    console.log('✅ Licença criada manualmente:', licenseKey, 'para', email);

    return res.status(200).json({
      success: true,
      message: 'Chave de licença gerada com sucesso',
      licenseKey,
      email,
      customerName: nome,
      expirationDate: license.expirationDate,
      instructions: 'Envie esta chave para o cliente via email'
    });

  } catch (error) {
    console.error('❌ Erro ao gerar chave:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export default handler;
