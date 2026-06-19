require("dotenv").config();
const {OAuth2Client} = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
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

app.post("/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: "Missing Google credential." });
  }

  try {
    // Ask Google to confirm this token is genuine and meant for our app
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const profile = ticket.getPayload();
    const email = profile.email;
    const name = profile.name || email.split("@")[0];

    // Find an existing account for this email...
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    // ...or create a new student account (no password — they'll use Google)
    if (!user) {
      const result = db
        .prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)")
        .run(name, email, "google-oauth", "student");
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    }

    // Issue OUR own token, exactly like a normal login does
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Google sign-in failed:", err);
    res.status(401).json({ error: "Google sign-in failed. Please try again." });
  }
});

// protected: returns the logged-in user's own profile
app.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?")
    .get(req.user.userId);

  res.json({ user });
});

// NEW: list all study materials
app.get("/materials", (req, res) => {
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

app.delete("/materials/:id", requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare("DELETE FROM materials WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Material not found." });
  }
  res.json({ success: true });
});

// All jobs (public)
app.get("/jobs", (req, res) => {
  const jobs = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all();
  res.json(jobs);
});

// Post a job (admin only)
app.post("/jobs", requireAuth, requireAdmin, (req, res) => {
  const { title, company, type, description, location, salary, url, tags } = req.body;
  if (!title || !company) {
    return res.status(400).json({ error: "Title and company are required." });
  }
  const result = db
    .prepare(
      "INSERT INTO jobs (title, company, type, description, location, salary, url, tags, posted_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(title, company, type || "fulltime", description || "", location || "", salary || "", url || "", tags || "", req.user.userId);
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(result.lastInsertRowid);
  res.json(job);
});

// Delete a job (admin only)
app.delete("/jobs/:id", requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Job not found." });
  }
  res.json({ success: true });
});

// Verified syllabus per branch-semester (add more here as you confirm them)
const tutorSyllabus = {
  "CSE-3": `- CIC-201 Data Structures & Algorithms: arrays & stacks, linked lists & trees, BSTs & graphs (BFS, DFS, AVL, Kruskal, Prim), sorting & hashing.
- CIC-203 Database Management Systems: ER & relational model, SQL & design, normalization (1NF–BCNF), transactions & concurrency (ACID, locking).`,
};

// Calls Gemini, retrying a few times on transient failures (rate limits, blips)
async function askGemini(systemPrompt, contents) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  const payload = { system_instruction: { parts: [{ text: systemPrompt }] }, contents };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) return { ok: true, data };

      console.error(`Gemini attempt ${attempt} failed (${response.status}):`, JSON.stringify(data));
      // Only retry temporary errors; bail out on config errors like 400/403
      if (![429, 500, 503].includes(response.status)) return { ok: false, status: response.status };
    } catch (err) {
      console.error(`Gemini attempt ${attempt} threw:`, err.message);
    }
    await new Promise((r) => setTimeout(r, 700 * attempt)); // wait, then retry
  }
  return { ok: false, status: 503 };
}

app.post("/tutor", async (req, res) => {
  const { messages, branch, semester } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No messages provided." });
  }

  const syllabus = tutorSyllabus[`${branch}-${semester}`];
  const systemPrompt = `You are StudyUSICT's AI study tutor for a student at USICT, GGSIPU (Guru Gobind Singh Indraprastha University), in the ${branch} branch, Semester ${semester}.
${syllabus ? "Their syllabus this semester includes:\n" + syllabus + "\n" : ""}Use your knowledge of the standard GGSIPU/USICT ${branch} curriculum for Semester ${semester} to ground your explanations and examples in the subjects this student is actually studying. Treat the syllabus as a reference to focus your help — not as a hard limit. Help them understand concepts, work through problems, write code and pseudocode, and prepare for university exams. You may also answer related academic and technical questions that aren't explicitly listed. Be clear and concise, and use simple language a student can follow.`;

  const contents = messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
  const result = await askGemini(systemPrompt, contents);

  if (!result.ok) {
    return res.status(503).json({ error: "The tutor is busy right now — please try again in a few seconds." });
  }

  const reply =
    result.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I couldn't generate a response for that — try rephrasing your question.";
  res.json({ reply });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});