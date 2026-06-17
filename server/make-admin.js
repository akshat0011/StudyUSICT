const db = require("./db");

const email = "akshat@studyipu.com"; // your account's email
db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);

console.log(`${email} is now an admin.`);