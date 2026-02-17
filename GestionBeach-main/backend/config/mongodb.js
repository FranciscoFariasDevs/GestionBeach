const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ffari:fari6996@sistema.951lnrt.mongodb.net/GestionBeachChat?retryWrites=true&w=majority&appName=SISTEMA';

let isConnected = false;

const connectMongo = async () => {
  if (isConnected) return mongoose.connection;

  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
    console.log('✅ MongoDB Atlas conectado - Base: GestionBeachChat');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    return null;
  }
};

module.exports = { connectMongo, mongoose };
