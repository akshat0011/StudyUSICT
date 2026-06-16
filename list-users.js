const db = require("./db");
console.log(db.prepare("SELECT * FROM users").all());