const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
let cachedClient = null;

async function getLicensesCollection() {
  if (!uri) {
    throw new Error('MONGODB_URI não configurada');
  }

  if (cachedClient) {
    const db = cachedClient.db('controlaai');
    return db.collection('licenses');
  }

  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  
  const db = client.db('controlaai');
  return db.collection('licenses');
}

module.exports = async (req, res) => {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { licenseKey, adminKey } = req.body;

    // Verifica chave de admin
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Acesso não autorizado'
      });
    }

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: 'Chave de licença obrigatória'
      });
    }

    // Validação de formato UUID
    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (!uuidRegex.test(licenseKey)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de chave inválido'
      });
    }

    const collection = await getLicensesCollection();
    
    // Cria chave nova no banco (sem ativar ainda)
    const licenseData = {
      licenseKey,
      deviceId: null,
      deviceInfo: {},
      createdAt: new Date(),
      activatedAt: null,
      lastVerified: null,
      status: 'pending' // Aguardando ativação
    };

    await collection.insertOne(licenseData);

    return res.status(200).json({
      success: true,
      message: 'Chave gerada com sucesso!',
      licenseKey: licenseKey
    });

  } catch (error) {
    console.error('Erro ao gerar chave:', error);
    
    // Se chave já existe, retorna erro
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Esta chave já existe no sistema'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};
