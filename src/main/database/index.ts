import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { logger } from '../../utils/logger';

// Path to the database file in the user data directory
const getDbPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'brain_anatomy.db');
};

// Database instance
let db: Database.Database | null = null;

/**
 * Initialize the database, creating tables if they don't exist
 */
export function initializeDatabase(): Database.Database {
  try {
    const dbPath = getDbPath();
    logger.info(`Initializing database at ${dbPath}`);

    // Create directory if it doesn't exist
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create tables if they don't exist
    createTables();

    logger.info('Database initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error as Error);
    throw error;
  }
}

/**
 * Create database tables
 */
function createTables() {
  if (!db) throw new Error('Database not initialized');

  // Brain structures table
  db.exec(`
    CREATE TABLE IF NOT EXISTS brain_structures (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      difficulty TEXT,
      model_path TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(id)
    )
  `);

  // User notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      structure_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (structure_id) REFERENCES brain_structures(id)
    )
  `);

  // Quiz results table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      structure_id TEXT,
      correct INTEGER NOT NULL,
      time_ms INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (structure_id) REFERENCES brain_structures(id)
    )
  `);

  // Anatomy facts table for LLM knowledge
  db.exec(`
    CREATE TABLE IF NOT EXISTS anatomy_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      structure_id TEXT,
      fact TEXT NOT NULL,
      category TEXT,
      source TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (structure_id) REFERENCES brain_structures(id)
    )
  `);
}

/**
 * Get the database instance, initializing if necessary
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

// Initialize database when the module is imported
export default getDatabase();