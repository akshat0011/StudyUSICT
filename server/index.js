require("dotenv").config();
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");
const cors = require("cors");
const rateLimit = require("express-rate-limit"); // NEW

const app = express();
const PORT = process.env.PORT || 3000;

// When deployed behind a hosting proxy (Render, Railway, etc.), set
// TRUST_PROXY=1 so rate limiting sees the real client IP, not the proxy's.
// Left off in local dev so X-Forwarded-For can't be spoofed to dodge limits.
app.set("trust proxy", Number(process.env.TRUST_PROXY) || false); // NEW

// CORS: in production, set CORS_ORIGIN to your site (comma-separated for more
// than one). If it's unset (local dev) we fall back to allowing any origin.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : undefined;
app.use(cors(corsOrigins ? { origin: corsOrigins } : undefined)); // CHANGED
app.use(express.json());

// Rate limiters — stop brute-forcing logins and abuse of the AI tutor.
// Auth: at most 20 attempts per IP every 15 minutes.
const authLimiter = rateLimit({         // NEW
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});
// Tutor: at most 15 messages per IP per minute (the tutor calls a paid API).
const tutorLimiter = rateLimit({        // NEW
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're sending messages too quickly — give it a moment." },
});

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

// gate that only lets admins through (use it AFTER requireAuth)
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admins only." });
  }
  next();
}

app.get("/", (req, res) => {
  res.send("Hello from the StudyUSICT backend!");
});

app.get("/health", (req, res) => {
  console.log("Health check:", new Date().toISOString());

  res.status(200).json({
    status: "ok",
    uptime: process.uptime()
  });
});

// create a new account
app.post("/signup", authLimiter, async (req, res) => { // CHANGED: rate-limited
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are all required." });
  }
  // NEW: basic validation so we don't store junk / weak credentials
  const cleanEmail = email.trim().toLowerCase();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  if (!emailLooksValid) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const result = await db.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id",
      [name.trim(), cleanEmail, hashedPassword]
    );
    res.status(201).json({ message: "Account created successfully!", userId: result.rows[0].id });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "An account with that email already exists." });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// log in to an existing account
app.post("/login", authLimiter, async (req, res) => { // CHANGED: rate-limited
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  try {
    const cleanEmail = email.trim().toLowerCase(); // NEW: match how we store emails
    const result = await db.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
    const user = result.rows[0];
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
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.post("/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: "Missing Google credential." });
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const profile = ticket.getPayload();
    const email = profile.email;
    const name = profile.name || email.split("@")[0];

    const found = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    let user = found.rows[0];

    if (!user) {
      const inserted = await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, email, "google-oauth", "student"]
      );
      user = inserted.rows[0];
    }

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
app.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
      [req.user.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// list all study materials (public)
app.get("/materials", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM materials ORDER BY created_at DESC");
    res.json({ materials: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load materials." });
  }
});

// add a new study material (admin only)
app.post("/materials", requireAuth, requireAdmin, async (req, res) => {
  const { title, subject, type, url } = req.body;
  if (!title || !subject || !url) {
    return res.status(400).json({ error: "Title, subject, and url are required." });
  }
  try {
    const result = await db.query(
      "INSERT INTO materials (title, subject, type, url, uploaded_by) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [title, subject, type || "notes", url, req.user.userId]
    );
    res.status(201).json({ message: "Material added!", id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't add material." });
  }
});

// delete a study material (admin only)
app.delete("/materials/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query("DELETE FROM materials WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Material not found." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't delete material." });
  }
});

// all jobs (public)
app.get("/jobs", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM jobs ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load jobs." });
  }
});

// post a job (admin only)
app.post("/jobs", requireAuth, requireAdmin, async (req, res) => {
  const { title, company, type, description, location, salary, url, tags } = req.body;
  if (!title || !company) {
    return res.status(400).json({ error: "Title and company are required." });
  }
  try {
    const result = await db.query(
      `INSERT INTO jobs (title, company, type, description, location, salary, url, tags, posted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, company, type || "fulltime", description || "", location || "", salary || "", url || "", tags || "", req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't post job." });
  }
});

// delete a job (admin only)
app.delete("/jobs/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query("DELETE FROM jobs WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Job not found." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't delete job." });
  }
});

// list subjects, filtered by year scheme + branch + semester (public)
app.get("/subjects", async (req, res) => {
  const { year = "2024_and_after", branch, semester, route } = req.query;

  const conditions = ["year_scheme = $1"];
  const params = [year];
  if (branch) {
    params.push(branch);
    conditions.push(`branch = $${params.length}`);
  }
  if (semester) {
    params.push(parseInt(semester, 10));
    conditions.push(`semester = $${params.length}`);
  }
  if (route) {
    params.push(route);
    conditions.push(`route = $${params.length}`);
  }

  try {
    const result = await db.query(
      `SELECT id, year_scheme, branch, semester, route, category, code, name,
              lecture_hours, practical_hours, credits, units
       FROM subjects
       WHERE ${conditions.join(" AND ")}
       ORDER BY semester, id`,
      params
    );
    res.json({ subjects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load subjects." });
  }
});

// add a subject + its syllabus units (admin only)
app.post("/subjects", requireAuth, requireAdmin, async (req, res) => {
  const {
    year_scheme, branch, semester, code, name,
    credits, units, lecture_hours, practical_hours, category, route,
  } = req.body;
  if (!year_scheme || !branch || !semester || !code || !name) {
    return res.status(400).json({
      error: "Year scheme, branch, semester, code, and name are required.",
    });
  }
  try {
    const result = await db.query(
      `INSERT INTO subjects
         (year_scheme, branch, semester, route, category, code, name,
          lecture_hours, practical_hours, credits, units)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, year_scheme, branch, semester, route, category, code, name,
                 lecture_hours, practical_hours, credits, units`,
      [
        year_scheme,
        branch,
        parseInt(semester, 10),
        route || null,
        category || null,
        code.trim(),
        name.trim(),
        lecture_hours != null ? parseInt(lecture_hours, 10) : null,
        practical_hours != null ? parseInt(practical_hours, 10) : null,
        credits != null && credits !== "" ? parseInt(credits, 10) : null,
        // units arrive as an array of { title, desc }; store as JSON text
        Array.isArray(units) && units.length ? JSON.stringify(units) : null,
      ]
    );
    res.status(201).json({ subject: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't add subject." });
  }
});

// delete a subject (admin only)
app.delete("/subjects/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query("DELETE FROM subjects WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Subject not found." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't delete subject." });
  }
});

// ===== AI Tutor =====
// Build the syllabus text for a branch + semester straight from the subjects
// table, so the tutor is grounded in the real catalog instead of a hardcoded
// stub. Returns "" when nothing is on file yet (the prompt then falls back to
// the model's general knowledge of the GGSIPU curriculum).
async function getSyllabusText(branch, semester, yearScheme) {
  const result = await db.query(
    `SELECT code, name, credits, units
       FROM subjects
      WHERE year_scheme = $1 AND branch = $2 AND semester = $3
      ORDER BY id`,
    [yearScheme, branch, parseInt(semester, 10)]
  );
  if (result.rows.length === 0) return "";

  return result.rows
    .map((s) => {
      let units = [];
      try {
        units = s.units ? JSON.parse(s.units) : [];
      } catch {
        units = [];
      }
      const unitText = Array.isArray(units) && units.length
        ? units
            .map((u, i) => `Unit ${i + 1}: ${u.title}${u.desc ? " — " + u.desc : ""}`)
            .join("; ")
        : "";
      const credits = s.credits != null ? ` (${s.credits} credits)` : "";
      return `- ${s.code} ${s.name}${credits}${unitText ? ": " + unitText : ""}`;
    })
    .join("\n");
}

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
      if (![429, 500, 503].includes(response.status)) return { ok: false, status: response.status };
    } catch (err) {
      console.error(`Gemini attempt ${attempt} threw:`, err.message);
    }
    await new Promise((r) => setTimeout(r, 700 * attempt));
  }
  return { ok: false, status: 503 };
}

app.post("/tutor", tutorLimiter, async (req, res) => { // CHANGED: rate-limited
  const { messages, branch, semester, year } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No messages provided." });
  }
  // Pull this semester's real syllabus from the database (default to the
  // current scheme). On any DB hiccup, fall back to a generic prompt.
  let syllabus = "";
  try {
    syllabus = await getSyllabusText(branch, semester, year || "2024_and_after");
  } catch (err) {
    console.error("Couldn't load syllabus for the tutor:", err.message);
  }
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

db.initDb().catch((err) => console.error("Failed to set up database:", err));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});