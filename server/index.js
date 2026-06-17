require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());

// lets the server read JSON sent in a request's body
app.use(express.json());

// gate: only lets a request through if it carries a valid token
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "You must be logged in." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// NEW: gate that only lets admins through (use it AFTER requireAuth)
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admins only." });
  }
  next();
}

app.get("/", (req, res) => {
  res.send("Hello from the StudyIPU backend!");
});

// create a new account
app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are all required." });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const result = db
      .prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
      .run(name, email, hashedPassword);

    res.status(201).json({
      message: "Account created successfully!",
      userId: result.lastInsertRowid,
    });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(409)
        .json({ error: "An account with that email already exists." });
    }
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// log in to an existing account
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    message: "Logged in successfully!",
    token: token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// protected: returns the logged-in user's own profile
app.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?")
    .get(req.user.userId);

  res.json({ user });
});

// NEW: list all study materials (must be logged in)
app.get("/materials", requireAuth, (req, res) => {
  const materials = db
    .prepare("SELECT * FROM materials ORDER BY created_at DESC")
    .all();
  res.json({ materials });
});

// NEW: add a new study material (must be logged in)
app.post("/materials", requireAuth, requireAdmin, (req, res) => {
  const { title, subject, type, url } = req.body;

  if (!title || !subject || !url) {
    return res
      .status(400)
      .json({ error: "Title, subject, and url are required." });
  }

  const result = db
    .prepare(
      "INSERT INTO materials (title, subject, type, url, uploaded_by) VALUES (?, ?, ?, ?, ?)"
    )
    .run(title, subject, type || "notes", url, req.user.userId);

  res
    .status(201)
    .json({ message: "Material added!", id: result.lastInsertRowid });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});