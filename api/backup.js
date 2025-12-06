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
    // Em desenvolvimento, use uma variável global para preservar o cliente
    // entre recargas de módulo causadas por HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // Em produção, é melhor não usar uma variável global.
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
        const { email, data } = req.body;

        // Validações básicos
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                message: 'Email inválido'
            });
        }

        if (!data) {
            return res.status(400).json({
                success: false,
                message: 'Dados não fornecidos'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Conecta ao MongoDB
        const client = await clientPromise;
        const db = client.db('controlaai'); // Nome do banco de dados
        const collection = db.collection('backups');

        const backupData = {
            email: normalizedEmail,
            transacoes: data.transacoes || [],
            despesasFixas: data.despesasFixas || [], // Cada despesa tem array de pagamentos interno
            lastBackup: new Date().toISOString(),
            version: data.version || '2.0'
        };

        // Salva ou atualiza o backup (Upsert)
        await collection.updateOne(
            { email: normalizedEmail },
            { $set: backupData },
            { upsert: true }
        );

        // Opcional: Salvar histórico em outra collection se desejar, 
        // mas para simplificar e economizar espaço, vamos manter apenas o último estado por enquanto,
        // ou você pode criar uma collection 'backup_history' separada.

        // Calcula total de pagamentos nas despesas fixas
        const totalPagamentos = (data.despesasFixas || []).reduce((sum, d) => 
            sum + (d.pagamentos ? d.pagamentos.length : 0), 0);

        return res.status(200).json({
            success: true,
            message: 'Backup realizado com sucesso!',
            backup: {
                email: normalizedEmail,
                timestamp: backupData.lastBackup,
                transacoes: backupData.transacoes.length,
                despesasFixas: backupData.despesasFixas.length,
                pagamentos: totalPagamentos
            }
        });

    } catch (error) {
        console.error('Erro ao fazer backup:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao realizar backup',
            error: error.message
        });
    }
};
