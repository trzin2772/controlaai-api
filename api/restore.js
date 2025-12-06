const { MongoClient } = require('mongodb');

// URI de conexão do MongoDB (já configurada no Vercel)
const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
    throw new Error('Adicione MONGODB_URI ao seu arquivo .env.local');
}

if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Método não permitido'
        });
    }

    try {
        const { email } = req.body;

        // Validações
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                message: 'Email inválido'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Conecta ao MongoDB
        const client = await clientPromise;
        const db = client.db('controlaai');
        const collection = db.collection('backups');

        // Busca o backup pelo email
        const backupData = await collection.findOne({ email: normalizedEmail });

        if (!backupData) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum backup encontrado para este email',
                hasBackup: false
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Backup recuperado com sucesso!',
            hasBackup: true,
            data: {
                transacoes: backupData.transacoes || [],
                despesasFixas: backupData.despesasFixas || [],
                // Mantém pagamentosDespesas para compatibilidade com backups antigos
                // O frontend fará a migração automática se necessário
                pagamentosDespesas: backupData.pagamentosDespesas || [],
                lastBackup: backupData.lastBackup,
                version: backupData.version
            },
            stats: {
                transacoes: (backupData.transacoes || []).length,
                despesasFixas: (backupData.despesasFixas || []).length,
                pagamentos: (backupData.despesasFixas || []).reduce((sum, d) => 
                    sum + (d.pagamentos ? d.pagamentos.length : 0), 0)
            }
        });

    } catch (error) {
        console.error('Erro ao restaurar backup:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao restaurar backup',
            error: error.message
        });
    }
};
