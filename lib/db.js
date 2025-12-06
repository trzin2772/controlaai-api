const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client;
let clientPromise;

if (!uri) {
  throw new Error('Por favor adicione a MONGODB_URI no arquivo .env');
}

if (process.env.NODE_ENV === 'development') {
  // Em desenvolvimento, usa cache global
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Em produção, cria nova conexão
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

async function getDatabase() {
  const client = await clientPromise;
  return client.db('controlaai');
}

async function getLicensesCollection() {
  const db = await getDatabase();
  return db.collection('licenses');
}

async function getConfigCollection() {
  const db = await getDatabase();
  return db.collection('config');
}

module.exports = { getDatabase, getLicensesCollection, getConfigCollection };
