import { getConfigCollection } from '../lib/db.js';

export default async function handler(req, res) {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const configCollection = await getConfigCollection();
    
    // Busca a configuração geral (pode ter apenas um documento com _id: "app-config")
    const config = await configCollection.findOne({ _id: 'app-config' });

    if (!config) {
      // Retorna configuração padrão se não existir
      return res.status(200).json({
        elevenLabsApiKey: '',
        elevenLabsVoiceId: 'TY3h8ANhQUsJaa0Bga5F' // Valor padrão
      });
    }

    return res.status(200).json({
      elevenLabsApiKey: config.elevenLabsApiKey || '',
      elevenLabsVoiceId: config.elevenLabsVoiceId || 'TY3h8ANhQUsJaa0Bga5F'
    });

  } catch (error) {
    console.error('❌ Erro ao buscar configuração:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar configuração',
      details: error.message 
    });
  }
}
