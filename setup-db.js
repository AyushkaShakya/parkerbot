// setup-db.js  (richer plans, per-policy expiry, 4 demo users)
// Run:  node setup-db.js   (delete the old parkerbot.db once first)
const Database = require("better-sqlite3");
const db = new Database("parkerbot.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    monthlyCost TEXT NOT NULL,
    coverage TEXT NOT NULL,
    term TEXT NOT NULL,
    benefits TEXT NOT NULL,
    details TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT, balance INTEGER NOT NULL DEFAULT 5000
  );
  CREATE TABLE IF NOT EXISTS user_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    policyName TEXT NOT NULL,
    expiresOn TEXT
  );
`);

const policies = [
  { name:"Basic Health", price:499, monthlyCost:"₹499 / month", term:"12 months",
    coverage:"Hospitalization up to ₹2,00,000",
    benefits:"Cashless treatment at 5,000+ hospitals; room rent, ICU & surgery covered; 1 free annual health check-up; tax benefits under Section 80D.",
    details:"An affordable entry health plan covering in-patient hospitalization and day-care procedures." },
  { name:"Premium Health", price:1299, monthlyCost:"₹1,299 / month", term:"12 months",
    coverage:"Hospitalization up to ₹10,00,000",
    benefits:"Everything in Basic Health; maternity & newborn cover; dental & optical; worldwide emergency treatment; no-claim bonus up to 50%.",
    details:"A comprehensive family health plan with high coverage and premium add-ons." },
  { name:"Car Insurance", price:833, monthlyCost:"₹833 / month (₹9,999 / year)", term:"12 months",
    coverage:"Own-damage + third-party up to ₹7,50,000",
    benefits:"Cashless repairs at 3,000+ garages; zero-depreciation cover; engine protection; 24x7 roadside assistance; theft & fire cover.",
    details:"Full car protection covering accidental damage, theft, and third-party liability." },
  { name:"Travel Insurance", price:299, monthlyCost:"₹299 per trip", term:"Per trip (up to 30 days)",
    coverage:"Medical + baggage up to ₹5,00,000",
    benefits:"Emergency medical & evacuation; trip cancellation cover; lost baggage & passport assistance; flight delay compensation.",
    details:"Per-trip cover for overseas travel emergencies and inconveniences." },
];
if (db.prepare("SELECT COUNT(*) AS n FROM policies").get().n === 0) {
  const ins = db.prepare("INSERT INTO policies (name,price,monthlyCost,coverage,term,benefits,details) VALUES (?,?,?,?,?,?,?)");
  for (const p of policies) ins.run(p.name,p.price,p.monthlyCost,p.coverage,p.term,p.benefits,p.details);
  console.log("Seeded", policies.length, "policies.");
}

// 4 demo users. rahul's Car Insurance expires very soon (for the renewal demo).
const users = [
  { id:"ayushka", name:"Ayushka", balance:8000, owns:[{ name:"Premium Health", expiresOn:"2027-03-01" }] },
  { id:"abc",     name:"abc",     balance:5000, owns:[{ name:"Car Insurance",   expiresOn:"2026-12-01" }] },
  { id:"gaurika",     name:"gaurika",     balance:3000, owns:[] },
  { id:"kanishka",   name:"kanishka",   balance:6000, owns:[{ name:"Car Insurance",   expiresOn:"2026-06-22" }] },
];
if (db.prepare("SELECT COUNT(*) AS n FROM users").get().n === 0) {
  const insU = db.prepare("INSERT INTO users (id,name,balance) VALUES (?,?,?)");
  const insP = db.prepare("INSERT INTO user_policies (userId,policyName,expiresOn) VALUES (?,?,?)");
  for (const u of users) {
    insU.run(u.id, u.name, u.balance);
    for (const p of u.owns) insP.run(u.id, p.name, p.expiresOn);
  }
  console.log("Seeded users: ayushka, abc, xyz, rahul (rahul's Car Insurance expires soon).");
}

db.close();
console.log("Database ready: parkerbot.db");