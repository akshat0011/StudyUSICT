const db = require("./db");

const email = `test${Date.now()}@example.com`;
db.prepare(
    "INSERT INTO users(name , email , password) VALUES (?,?,?)"
).run("Test Student" , email, "temp-pass");

const users = db.prepare("SELECT * FROM users").all();
console.log("Users in the database:");
console.log(users);