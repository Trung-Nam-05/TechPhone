import DatabaseConnection from '../patterns/singleton/DatabaseConnection.js';

/** Facade — giữ import cũ `connectDatabase()` cho index.js */
export async function connectDatabase() {
  return DatabaseConnection.getInstance().connect();
}

export function getDatabaseConnection() {
  return DatabaseConnection.getInstance().getConnection();
}

export { DatabaseConnection };
