import dns from 'node:dns';
import mongoose from 'mongoose';

dns.setDefaultResultOrder('ipv4first');

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI in environment variables.');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 20000,
    family: 4,
  });
  return mongoose.connection;
}
