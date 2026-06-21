import { useState } from "react";

// The official GGSIPU exam result portal — students log in there directly.
// StudyUSICT never handles their credentials.
const PORTAL_URL = "https://examweb.ggsipu.ac.in/web/login.jsp";

function ResultsPage() {
  // Each row = one semester's SGPA (credits optional, for an exact CGPA)
  const [rows, setRows] = useState([
    { id: 1, sgpa: "", credits: "" },
    { id: 2, sgpa: "", credits: "" },
  ]);

  function updateRow(id, field, value) {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    setRows([...rows, { id: Date.now(), sgpa: "", credits: "" }]);
  }
  function removeRow(id) {
    setRows(rows.filter((r) => r.id !== id));
  }

  // Only count rows with a valid SGPA between 0 and 10
  const valid = rows.filter((r) => {
    const n = Number(r.sgpa);
    return r.sgpa !== "" && !isNaN(n) && n >= 0 && n <= 10;
  });
  const allHaveCredits = valid.length > 0 && valid.every((r) => Number(r.credits) > 0);

  // CGPA: credit-weighted when every semester has credits (the GGSIPU way),
  // otherwise a simple average of SGPAs.
  let cgpa = 0;
  let totalCredits = 0;
  if (valid.length > 0) {
    if (allHaveCredits) {
      let weighted = 0;
      for (const r of valid) {
        totalCredits += Number(r.credits);
        weighted += Number(r.sgpa) * Number(r.credits);
      }
      cgpa = weighted / totalCredits;
    } else {
      cgpa = valid.reduce((a, r) => a + Number(r.sgpa), 0) / valid.length;
      totalCredits = valid.reduce((a, r) => a + (Number(r.credits) || 0), 0);
    }
  }
  const hasData = valid.length > 0;
  const percentage = cgpa * 9.5; // GGSIPU CGPA → percentage formula

  // Highlight the best semester in the chart
  let bestIdx = -1;
  let bestVal = -1;
  valid.forEach((r, i) => {
    if (Number(r.sgpa) > bestVal) {
      bestVal = Number(r.sgpa);
      bestIdx = i;
    }
  });

  // CGPA ring geometry
  const ringR = 72;
  const ringC = 2 * Math.PI * ringR;
  const ringPct = Math.max(0, Math.min(1, cgpa / 10));

  // Bar-chart geometry (drawn as a responsive SVG)
  const chartW = 720;
  const chartH = 260;
  const padX = 38;
  const padTop = 24;
  const padBottom = 36;
  const innerH = chartH - padTop - padBottom;
  const slot = valid.length > 0 ? (chartW - padX * 2) / valid.length : 0;
  const barW = Math.min(52, slot * 0.5);
  const yFor = (v) => padTop + innerH * (1 - v / 10);
  const gridVals = [0, 2, 4, 6, 8, 10];

  return (
    <div className="page">
      <section className="result-hero">
        <span className="about-badge">Results</span>
        <h1 className="result-hero-title">Your Results, Beautifully Analyzed</h1>
        <p className="result-hero-text">
          Check your official GGSIPU result, then drop in your semester SGPAs to see your CGPA,
          percentage, and a semester-by-semester breakdown — all in one clean view.
        </p>
      </section>

      {/* Official portal — link out, no credentials touched */}
      <section className="result-portal">
        <div className="result-portal-text">
          <h2 className="panel-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6M7 16h8"/></svg>
            Check your official IPU result
          </h2>
          <p>
            Log in on the official GGSIPU exam portal with your enrollment number, password, and
            captcha. <strong>StudyUSICT never sees your credentials</strong> — this opens the
            university's own site in a new tab.
          </p>
        </div>
        <a className="result-portal-btn" href={PORTAL_URL} target="_blank" rel="noopener noreferrer">
          Open IPU Result Portal
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>
        </a>
      </section>

      <div className="result-grid">
        {/* Input */}
        <section className="gpa-card">
          <h2 className="panel-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></svg>
            CGPA Analyzer
          </h2>
          <p className="gpa-desc">
            Enter each semester's SGPA. Add the semester's total credits for an exact,
            credit-weighted CGPA (the GGSIPU method); without credits we use a simple average.
          </p>

          <div className="result-input-head">
            <span>Semester</span>
            <span>SGPA (0–10)</span>
            <span>Credits</span>
            <span></span>
          </div>

          {rows.map((r, i) => (
            <div className="result-input-row" key={r.id}>
              <span className="result-sem-label">Sem {i + 1}</span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={r.sgpa}
                placeholder="e.g. 8.4"
                onChange={(e) => updateRow(r.id, "sgpa", e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="1"
                value={r.credits}
                placeholder="opt."
                onChange={(e) => updateRow(r.id, "credits", e.target.value)}
              />
              <button className="result-row-del" onClick={() => removeRow(r.id)} aria-label="Remove semester">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          ))}

          <button className="result-add-sem" onClick={addRow}>+ Add Semester</button>
        </section>

        {/* Summary: CGPA ring + stat cards */}
        <section className="gpa-card result-summary">
          <svg viewBox="0 0 180 180" className="cgpa-ring-svg">
            <circle className="ring-track" cx="90" cy="90" r={ringR} fill="none" strokeWidth="14" />
            <circle
              className="ring-fill"
              cx="90"
              cy="90"
              r={ringR}
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={ringC}
              strokeDashoffset={ringC * (1 - ringPct)}
              transform="rotate(-90 90 90)"
            />
            <text x="90" y="86" textAnchor="middle" className="ring-value">
              {hasData ? cgpa.toFixed(2) : "—"}
            </text>
            <text x="90" y="108" textAnchor="middle" className="ring-label">CGPA / 10</text>
          </svg>

          <div className="result-stats">
            <div className="result-stat">
              <div className="result-stat-val">{hasData ? `${percentage.toFixed(2)}%` : "—"}</div>
              <div className="result-stat-label">Percentage</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-val">{totalCredits || "—"}</div>
              <div className="result-stat-label">Credits</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-val">{valid.length || "—"}</div>
              <div className="result-stat-label">Semesters</div>
            </div>
          </div>

          <p className="result-formula">
            Percentage = CGPA × 9.5{" "}
            <span className="result-formula-note">
              ({allHaveCredits ? "credit-weighted CGPA" : "simple average — add credits for exact CGPA"})
            </span>
          </p>
        </section>
      </div>

      {/* SGPA-by-semester bar chart */}
      <section className="gpa-card">
        <h2 className="panel-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          SGPA by Semester
        </h2>
        {hasData ? (
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="result-bars" preserveAspectRatio="xMidYMid meet">
            {gridVals.map((v) => (
              <g key={v}>
                <line className="grid-line" x1={padX} y1={yFor(v)} x2={chartW - padX} y2={yFor(v)} />
                <text className="grid-label" x={padX - 10} y={yFor(v) + 4} textAnchor="end">{v}</text>
              </g>
            ))}
            {valid.map((r, i) => {
              const v = Number(r.sgpa);
              const x = padX + i * slot + (slot - barW) / 2;
              const y = yFor(v);
              const h = padTop + innerH - y;
              return (
                <g key={i}>
                  <rect className={i === bestIdx ? "bar best" : "bar"} x={x} y={y} width={barW} height={h} rx="6" />
                  <text className="bar-value" x={x + barW / 2} y={y - 8} textAnchor="middle">{v.toFixed(1)}</text>
                  <text className="bar-label" x={x + barW / 2} y={padTop + innerH + 22} textAnchor="middle">S{i + 1}</text>
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="result-empty">Enter your semester SGPAs above to see the chart.</p>
        )}
      </section>
    </div>
  );
}

export default ResultsPage;
