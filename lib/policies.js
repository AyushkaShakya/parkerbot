// lib/policies.js
// -----------------------------------------------------------------------------
// findPolicy now queries the REAL SQLite database (parkerbot.db) instead of a
// hard-coded list. The tool and the chat loop didn't change at all — only this
// file knows where the data lives. That's the payoff of the design we used.
// -----------------------------------------------------------------------------
import Database from "better-sqlite3";
import path from "path";

// Open the database file that setup-db.js created (in the project root).
// We open it once and reuse it. process.cwd() = your project folder.
const db = new Database(path.join(process.cwd(), "parkerbot.db"));

// Find a policy by a loose, case-insensitive name match using SQL.
// The "?" is a placeholder — better-sqlite3 fills it in safely (prevents SQL
// injection). LIKE with % means "name contains this text".
export function findPolicy(query) {
  const q = (query || "").trim();
  if (!q) return null;

  const row = db
    .prepare("SELECT * FROM policies WHERE name LIKE ? COLLATE NOCASE LIMIT 1")
    .get(`%${q}%`);

  return row || null;
}