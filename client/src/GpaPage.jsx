import { useState } from "react";

const creditOptions = ["1", "2", "3", "4", "5", "6"];

const grades = [
  { label: "O (10)", value: "10" },
  { label: "A+ (9)", value: "9" },
  { label: "A (8)", value: "8" },
  { label: "B+ (7)", value: "7" },
  { label: "B (6)", value: "6" },
  { label: "C (5)", value: "5" },
  { label: "P (4)", value: "4" },
  { label: "F (0)", value: "0" },
];

const initialSubjects = [
  { id: 1, name: "Data Structures & Algorithms", credits: "4", grade: "10" },
  { id: 2, name: "Database Management Systems", credits: "4", grade: "10" },
  { id: 3, name: "Practicals / Software Lab", credits: "2", grade: "9" },
  { id: 4, name: "Environmental Science / Core seminar", credits: "2", grade: "9" },
];

function GpaPage() {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [cgpa, setCgpa] = useState("8.5"); // NEW

  function updateSubject(id, changes) {
    setSubjects(subjects.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  }

  function addSubject() {
    setSubjects([...subjects, { id: Date.now(), name: "", credits: "4", grade: "10" }]);
  }

  function removeSubject(id) {
    setSubjects(subjects.filter((s) => s.id !== id));
  }

  let totalCredits = 0;
  let weighted = 0;
  for (const s of subjects) {
    totalCredits += Number(s.credits);
    weighted += Number(s.credits) * Number(s.grade);
  }
  const sgpa = totalCredits === 0 ? "0.00" : (weighted / totalCredits).toFixed(2);

  const percentage = (Number(cgpa) * 9.5).toFixed(2); // NEW

  return (
    <div className="page">
      <div className="gpa-grid">
        <section className="gpa-card">
          <div className="gpa-card-head">
            <h2 className="panel-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h2M8 18h2"/></svg>
              GGSIPU SGPA Calculator
            </h2>
            <span className="gpa-pill">Semester: 03 (CSE)</span>
          </div>

          <p className="gpa-desc">
            Grades points are allocated per GGSIPU policy (O=10, A+=9, A=8, B+=7, etc.).
            Complete your subjects checklist below to formulate the expected SGPA for current
            evaluation term.
          </p>

          <div className="subj-head">
            <span>Subject / Course Name</span>
            <span>Credits</span>
            <span>Grade Point</span>
          </div>

          {subjects.map((s) => (
            <div className="subj-row" key={s.id}>
              <button className="subj-del" onClick={() => removeSubject(s.id)} aria-label="Remove subject">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
              <input
                className="subj-name"
                value={s.name}
                placeholder="Subject name"
                onChange={(e) => updateSubject(s.id, { name: e.target.value })}
              />
              <select value={s.credits} onChange={(e) => updateSubject(s.id, { credits: e.target.value })}>
                {creditOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={s.grade} onChange={(e) => updateSubject(s.id, { grade: e.target.value })}>
                {grades.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          ))}

          <div className="gpa-footer">
            <button className="add-subj" onClick={addSubject}>+ Add Custom Subject</button>
            <div className="sgpa-result">
              <div className="sgpa-label">Computed Semester SGPA</div>
              <div className="sgpa-value">{sgpa}</div>
            </div>
          </div>
        </section>

        {/* NEW: CGPA → percentage card */}
        <section className="gpa-card">
          <div className="gpa-card-head">
            <h2 className="panel-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/></svg>
              IPU CGPA to Percentage
            </h2>
          </div>

          <p className="gpa-desc">
            Interview placement forms always request your aggregated percentage. Enter your
            official GGSIPU cumulative CGPA to calculate percentage instantly.
          </p>

          <label className="field-label">Aggregated CGPA (4.00 - 10.00)</label>
          <div className="cgpa-input-row">
            <input
              className="cgpa-number"
              type="number"
              min="4"
              max="10"
              step="0.01"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
            />
            <div className="cgpa-result">{percentage} %</div>
          </div>

          <input
            className="cgpa-slider"
            type="range"
            min="4"
            max="10"
            step="0.01"
            value={cgpa}
            onChange={(e) => setCgpa(e.target.value)}
          />

          <div className="formula-box">
            <div className="formula-label">Formula Directive</div>
            <p className="formula-intro">
              As per GGSIPU standard criteria (Indraprastha University regulation parameters):
            </p>
            <div className="formula-eq">Percentage (%) = CGPA × 9.5</div>
            <p className="formula-example">
              Example: A CGPA of 8.50 converts to 80.75% (8.5 × 9.5).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default GpaPage;