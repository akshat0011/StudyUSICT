import { useState } from "react";
import { useNavigate, Link } from "react-router";

const branches = [
  { code: "CSE", name: "CSE - Computer Science & Engineering" },
  { code: "IT", name: "IT - Information Technology" },
  { code: "ECE", name: "ECE - Electronics & Communication" },
  { code: "AIML", name: "AIML - AI & Machine Learning" },
  { code: "AIDS", name: "AIDS - AI & Data Science" },
];

const semesters = [
  { value: "1", label: "Semester 1 (Odd)" },
  { value: "2", label: "Semester 2 (Even)" },
  { value: "3", label: "Semester 3 (Odd)" },
  { value: "4", label: "Semester 4 (Even)" },
  { value: "5", label: "Semester 5 (Odd)" },
  { value: "6", label: "Semester 6 (Even)" },
  { value: "7", label: "Semester 7 (Odd)" },
  { value: "8", label: "Semester 8 (Even)" },
];

function DashboardPage() {
  const navigate = useNavigate();
  const [branch, setBranch] = useState("CSE");
  const [semester, setSemester] = useState("3");

  return (
    <div className="page">
      <section className="hero">
        <h1 className="hero-title">Your Comprehensive Academic Portal for GGSIPU USICT</h1>
        <p className="hero-text">
          Designed to bring all GGSIPU study resources in one unified hub. Browse actual
          examination previous papers, review high-quality study notes, access curated video
          collections from YouTube, and practice mock questions with the <span className="hero-highlight">Syllabus AI Companion</span>.
        </p>
        <div className="hero-actions">
          <Link to="/resources" className="btn btn-primary">Explore Resource Hub →</Link>
          <Link to="/tutor" className="btn btn-dark">Try AI Study Tutor</Link>
        </div>
      </section>

      <section className="access-panel">
        <h2 className="panel-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          Syllabus &amp; Material Access Portal
        </h2>

        <div className="access-fields">
          <div className="field">
            <label className="field-label">Select Engineering Branch</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              {branches.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Select Semester</label>
            <select value={semester} onChange={(e) => setSemester(e.target.value)}>
              {semesters.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="access-btn" onClick={() => navigate("/resources")}>
          Open Resources for Semester {semester} ({branch}) →
        </button>
      </section>
    </div>
  );
}

export default DashboardPage;