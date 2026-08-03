import dns from 'node:dns';
import mongoose from 'mongoose';

dns.setDefaultResultOrder('ipv4first');

/**
 * Singleton Pattern — một connection pool MongoDB cho toàn server.
 * Mọi model Mongoose dùng chung instance qua getInstance().connect().
 *
 * @see docs/design-patterns/PATTERN-MAP.md — Singleton
 */
class DatabaseConnection {
  static #instance = null;

  /** @type {Promise<import('mongoose').Connection>|null} */
  #connectPromise = null;

  constructor() {
    if (DatabaseConnection.#instance) {
      throw new Error('DatabaseConnection is a singleton. Use DatabaseConnection.getInstance().');
    }
  }

  static getInstance() {
    if (!DatabaseConnection.#instance) {
      DatabaseConnection.#instance = new DatabaseConnection();
    }
    return DatabaseConnection.#instance;
  }

  /** @returns {Promise<import('mongoose').Connection>} */
  async connect() {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    if (this.#connectPromise) {
      return this.#connectPromise;
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('Missing MONGODB_URI in environment variables.');
    }

    this.#connectPromise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 20000,
        family: 4,
      })
      .then(() => mongoose.connection)
      .catch((error) => {
        this.#connectPromise = null;
        throw error;
      });

    return this.#connectPromise;
  }

  getConnection() {
    return mongoose.connection;
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

export default DatabaseConnection;
