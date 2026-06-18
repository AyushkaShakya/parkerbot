// lib/db.js
// -----------------------------------------------------------------------------
// One shared SQLite connection + all the helpers the tools use.
// Everything that touches a user uses their userId (passed from the server),
// never an id the LLM made up — so users can only act on their own account.
// -----------------------------------------------------------------------------
import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "parkerbot.db"));

// --- date helpers ---
const now = () => new Date();
const addYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };
const toISO = (d) => new Date(d).toISOString().slice(0, 10);
const daysLeft = (iso) => (iso ? Math.ceil((new Date(iso) - now()) / 86400000) : null);

// Make sure a user row exists (creates one with a starting balance if new).
export function ensureUser(userId) {
  if (!userId) return null;
  let u = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!u) {
    db.prepare("INSERT INTO users (id, name, balance) VALUES (?, ?, ?)").run(userId, "New User", 5000);
    u = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  }
  return u;
}

export function getBalance(userId) {
  const u = db.prepare("SELECT balance FROM users WHERE id = ?").get(userId);
  return u ? u.balance : 0;
}

// The user's policies, each with how many days until it expires.
export function getUserPolicies(userId) {
  const rows = db.prepare("SELECT policyName, expiresOn FROM user_policies WHERE userId = ?").all(userId);
  return rows.map((r) => ({ policyName: r.policyName, expiresOn: r.expiresOn, daysLeft: daysLeft(r.expiresOn) }));
}

// Look up a plan in the catalog (loose, case-insensitive).
export function findPolicy(query) {
  const q = (query || "").trim();
  if (!q) return null;
  return db.prepare("SELECT * FROM policies WHERE name LIKE ? COLLATE NOCASE LIMIT 1").get(`%${q}%`) || null;
}

// Plans the user does NOT already have (to offer them).
export function recommendForUser(userId) {
  const owned = new Set(getUserPolicies(userId).map((p) => p.policyName.toLowerCase()));
  return db.prepare("SELECT name, monthlyCost, coverage FROM policies").all()
    .filter((p) => !owned.has(p.name.toLowerCase()));
}

// Buy a NEW plan: checks catalog, ownership, and balance; deducts price.
export function buyPolicy(userId, policyName) {
  const policy = findPolicy(policyName);
  if (!policy) return { ok: false, message: "That plan isn't in our catalog." };
  const owned = getUserPolicies(userId).some((p) => p.policyName.toLowerCase() === policy.name.toLowerCase());
  if (owned) return { ok: false, message: `You already have ${policy.name}.` };
  const balance = getBalance(userId);
  if (balance < policy.price) return { ok: false, message: "Not enough balance.", balance, price: policy.price };

  const expiresOn = toISO(addYears(now(), 1));
  db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(policy.price, userId);
  db.prepare("INSERT INTO user_policies (userId, policyName, expiresOn) VALUES (?, ?, ?)").run(userId, policy.name, expiresOn);
  return { ok: true, bought: policy.name, charged: policy.price, balance: getBalance(userId), expiresOn };
}

// Renew an EXISTING plan: extends expiry by a year and charges the price.
export function renewPolicy(userId, policyName) {
  const row = db.prepare("SELECT * FROM user_policies WHERE userId = ? AND policyName LIKE ? COLLATE NOCASE")
    .get(userId, `%${policyName}%`);
  if (!row) return { ok: false, message: "You don't have that plan to renew." };
  const policy = findPolicy(row.policyName);
  const price = policy ? policy.price : 0;
  const balance = getBalance(userId);
  if (balance < price) return { ok: false, message: "Not enough balance to renew.", balance, price };

  const base = row.expiresOn && new Date(row.expiresOn) > now() ? new Date(row.expiresOn) : now();
  const newExpiry = toISO(addYears(base, 1));
  db.prepare("UPDATE user_policies SET expiresOn = ? WHERE id = ?").run(newExpiry, row.id);
  db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(price, userId);
  return { ok: true, renewed: row.policyName, charged: price, balance: getBalance(userId), expiresOn: newExpiry };
}

// Cancel a plan: removes it and refunds the price (simplified demo logic).
export function cancelPolicy(userId, policyName) {
  const row = db.prepare("SELECT * FROM user_policies WHERE userId = ? AND policyName LIKE ? COLLATE NOCASE")
    .get(userId, `%${policyName}%`);
  if (!row) return { ok: false, message: "You don't have that plan." };
  const policy = findPolicy(row.policyName);
  const refund = policy ? policy.price : 0;
  db.prepare("DELETE FROM user_policies WHERE id = ?").run(row.id);
  db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(refund, userId);
  return { ok: true, cancelled: row.policyName, refunded: refund, balance: getBalance(userId) };
}

export { db };