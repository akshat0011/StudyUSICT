// make-admin.js — promote a user to admin by email.
// Usage: node make-admin.js you@example.com
const db = require("./db");

const email = process.argv[2];
if (!email) {
  console.log("Usage: node make-admin.js <email>");
  process.exit(1);
}

const result = db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);

if (result.changes === 0) {
  console.log(`No user found with email: ${email}`);
} else {
  console.log(`✓ ${email} is now an admin. Log out and back in for it to take effect.`);
}