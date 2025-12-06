import { getConfigCollection } from '../lib/db.js';

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

  try {
    const { elevenLabsApiKey, elevenLabsVoiceId } = req.body;

    // Validação básica
    if (!elevenLabsApiKey && !elevenLabsVoiceId) {
      return res.status(400).json({ 
        error: 'Envie pelo menos elevenLabsApiKey ou elevenLabsVoiceId' 
      });
    }

    const configCollection = await getConfigCollection();
    
    // Primeiro, remove campos duplicados ou antigos
    await configCollection.updateOne(
      { _id: 'app-config' },
      { 
        $unset: { 
          elevenLabsVoiceId: "",
          elevenLabsApiKey: ""
        }
      }
    );
    
    // Prepara os dados para atualização
    const updateData = {
      updatedAt: new Date()
    };

    if (elevenLabsApiKey) {
      updateData.elevenLabsApiKey = elevenLabsApiKey;
    }

    if (elevenLabsVoiceId) {
      updateData.elevenLabsVoiceId = elevenLabsVoiceId;
    }

    // Atualiza ou cria a configuração (upsert)
    const result = await configCollection.updateOne(
      { _id: 'app-config' },
      { 
        $set: updateData,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      modified: result.modifiedCount > 0 || result.upsertedCount > 0
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar configuração:', error);
    return res.status(500).json({ 
      error: 'Erro ao atualizar configuração',
      details: error.message 
    });
  }
}
