const Database = require("better-sqlite3");

const db = new Database("college.db");

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`).run();

console.log("Database ready, users table is set up.");

// NEW: table for study materials, PYQs, and playlists
db.prepare(`
  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'notes',
    url TEXT NOT NULL,
    uploaded_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// New: table for jobs 
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'fulltime',
    description TEXT,
    location TEXT,
    salary TEXT,
    url TEXT,
    tags TEXT,
    posted_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);


module.exports = db;