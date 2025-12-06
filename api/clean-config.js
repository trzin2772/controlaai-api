import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

export default async function handler(req, res) {
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

  let client;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db('controlaai');
    const configCollection = db.collection('config');

    // Busca o documento atual
    const doc = await configCollection.findOne({ _id: 'app-config' });

    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    console.log('📄 Documento atual:', doc);

    // Delete e recria limpo
    await configCollection.deleteOne({ _id: 'app-config' });

    const cleanDoc = {
      _id: 'app-config',
      elevenLabsApiKey: doc.elevenLabsApiKey || '',
      elevenLabsVoiceId: doc.elevenLabsVoiceId || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('🔄 Inserindo documento limpo:', cleanDoc);
    await configCollection.insertOne(cleanDoc);

    // Verifica se ficou limpo
    const cleaned = await configCollection.findOne({ _id: 'app-config' });

    return res.status(200).json({
      success: true,
      message: 'Configuração limpa com sucesso',
      data: cleaned
    });

  } catch (error) {
    console.error('❌ Erro ao limpar configuração:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });

  } finally {
    if (client) {
      await client.close();
    }
  }
}
