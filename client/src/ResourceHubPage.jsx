import { API_URL } from "./api";
import { useState, useEffect } from "react";
import { branchCodes as branches, branchNames } from "./branches"; // CHANGED: shared list

const yearSchemes = [
  { id: "2024_and_after", label: "2024 & after" },
  { id: "2023_and_before", label: "2023 & before" },
];

const semesters = ["1", "2", "3", "4", "5", "6", "7", "8"];

const contentTabs = [
  { id: "syllabus", label: "Syllabus" },
  { id: "notes", label: "Notes" },
  { id: "lectures", label: "Lectures" },
  { id: "papers", label: "IPU Past Papers (PYQs)" },
];

// Each content tab maps to a material "type" stored in the database
const tabTypeMap = { notes: "notes", lectures: "playlist", papers: "pyq" };
// The reverse — which tab to open after adding a given material type
const typeTabMap = { notes: "notes", playlist: "lectures", pyq: "papers" };

// The database stores a subject's units as JSON text (an array of { title, desc }).
// Rows without content yet come back as null, so default to an empty list.
function parseUnits(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ResourceHubPage({ user }) {
  const [yearScheme, setYearScheme] = useState("2024_and_after");
  const [branch, setBranch] = useState("CSE");
  const [semester, setSemester] = useState("3");
  const [search, setSearch] = useState("");

  // Subjects now come from the database, filtered by year + branch + semester
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectsError, setSubjectsError] = useState("");

  const [selectedCode, setSelectedCode] = useState("");
  const [activeTab, setActiveTab] = useState("syllabus");

  // Materials loaded from the database
  const [materials, setMaterials] = useState([]);

  // Popup state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState("notes");
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Which syllabus units are checked off (remembered in the browser)
  const [checked, setChecked] = useState(() =>
    JSON.parse(localStorage.getItem("usict-progress") || "{}")
  );

  // Load every material once, when the page first opens
  useEffect(() => {
    fetch(API_URL + "/materials")
      .then((res) => res.json())
      .then((data) => setMaterials(Array.isArray(data) ? data : data.materials || []))
      .catch(() => {});
  }, []);

  // Load subjects whenever the year scheme / branch / semester changes
  useEffect(() => {
    // Intentionally flip to a loading state the moment the filters change,
    // before the fetch resolves — a normal data-fetching pattern.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setLoadingSubjects(true);
    setSubjectsError("");
    const url = `${API_URL}/subjects?year=${yearScheme}&branch=${branch}&semester=${semester}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const list = data.subjects || [];
        setSubjects(list);
        setSelectedCode(list.length ? list[0].code : ""); // select the first subject
        setLoadingSubjects(false);
      })
      .catch(() => {
        setSubjects([]);
        setSelectedCode("");
        setSubjectsError("Couldn't load subjects — the backend may be waking up. Try again in a moment.");
        setLoadingSubjects(false);
      });
  }, [yearScheme, branch, semester]);

  // Save progress whenever a box is ticked or unticked
  useEffect(() => {
    localStorage.setItem("usict-progress", JSON.stringify(checked));
  }, [checked]);

  // Filter the catalog by the search box (matches name or code)
  const q = search.trim().toLowerCase();
  const visibleSubjects = q
    ? subjects.filter(
        (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
      )
    : subjects;

  const selected = subjects.find((s) => s.code === selectedCode);
  const activeLabel = contentTabs.find((t) => t.id === activeTab).label;
  const selectedUnits = parseUnits(selected?.units);

  // The materials belonging to the open subject AND the open tab
  const tabType = tabTypeMap[activeTab]; // undefined while on "syllabus"
  const tabMaterials =
    tabType && selected
      ? materials.filter((m) => m.subject === selected.code && m.type === tabType)
      : [];

  // How many units of the open subject are checked off
  const doneCount = selected
    ? selectedUnits.filter((u, i) => checked[`${selected.code}-${i}`]).length
    : 0;

  function toggleUnit(code, index) {
    const key = `${code}-${index}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function openAddModal() {
    setFormType(tabTypeMap[activeTab] || "notes");
    setFormTitle("");
    setFormUrl("");
    setFormError("");
    setIsModalOpen(true);
  }

  async function handlePublish() {
    setFormError("");
    if (!formTitle.trim() || !formUrl.trim()) {
      setFormError("Please fill in both the title and the link.");
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_URL + "/materials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          url: formUrl.trim(),
          type: formType,
          subject: selected.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Could not publish. Please try again.");
        setSubmitting(false);
        return;
      }
      const listRes = await fetch(API_URL + "/materials");
      const listData = await listRes.json();
      setMaterials(Array.isArray(listData) ? listData : listData.materials || []);
      setActiveTab(typeTabMap[formType]);
      setIsModalOpen(false);
      setFormTitle("");
      setFormUrl("");
      setSubmitting(false);
    } catch {
      setFormError("Couldn't reach the server. Is the backend running?");
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Remove this resource? This can't be undone.");
    if (!confirmed) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/materials/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `Couldn't delete (server responded ${res.status}). Make sure the delete route is added in server/index.js and you restarted the backend.`);
        return;
      }
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch {
      alert("Couldn't reach the backend — is it running?");
    }
  }

  return (
    <div className="page">
      <div className="hub-filter">
        <div className="filter-group">
          <span className="filter-label">Syllabus Scheme</span>
          <select value={yearScheme} onChange={(e) => setYearScheme(e.target.value)}>
            {yearSchemes.map((y) => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-divider"></div>

        <div className="filter-group">
          <span className="filter-label">USICT Branch</span>
          <div className="branch-tabs">
            {branches.map((b) => (
              <button
                key={b}
                className={b === branch ? "branch-tab active" : "branch-tab"}
                onClick={() => setBranch(b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-divider"></div>

        <div className="filter-group">
          <span className="filter-label">Current Semester</span>
          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            {semesters.map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        <div className="filter-right">
          <span className="filter-label">Filtering Syllabus</span>
          <span className="filter-branch-name">{branchNames[branch]}</span>
        </div>
      </div>

      <div className="hub-grid">
        <aside className="hub-aside">
          <div className="catalog-label">Semester Subject Catalog</div>
          <input
            className="modal-input cat-search"
            type="text"
            value={search}
            placeholder="Search subjects by name or code…"
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="cat-list">
            {loadingSubjects ? (
              <div className="tab-empty">Loading subjects…</div>
            ) : subjectsError ? (
              <div className="tab-empty">{subjectsError}</div>
            ) : visibleSubjects.length === 0 ? (
              <div className="tab-empty">
                {subjects.length === 0
                  ? "No subjects found for this branch and semester yet."
                  : "No subjects match your search."}
              </div>
            ) : (
              visibleSubjects.map((s) => (
                <button
                  key={s.code}
                  className={s.code === selectedCode ? "cat-card active" : "cat-card"}
                  onClick={() => setSelectedCode(s.code)}
                >
                  <div className="cat-card-top">
                    <span className="cat-code">{s.code}</span>
                    <span className="cat-cr">
                      {s.credits != null ? `${s.credits} Credits` : "—"}
                    </span>
                  </div>
                  <div className="cat-name">{s.name}</div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="hub-detail">
          {!selected ? (
            <div className="tab-empty">
              {loadingSubjects
                ? "Loading…"
                : "No subjects to display for this branch and semester yet."}
            </div>
          ) : (
            <>
              <div className="detail-top">
                <span className="course-badge">Official GGSIPU Course: {selected.code}</span>
                <span className="exam-weight">Exam Weightage: Continuous evaluation criteria applies</span>
              </div>

              <h2 className="detail-title">{selected.name}</h2>
              {selected.desc && <p className="detail-desc">{selected.desc}</p>}

              <div className="detail-tabs">
                {contentTabs.map((t) => (
                  <button
                    key={t.id}
                    className={t.id === activeTab ? "detail-tab active" : "detail-tab"}
                    onClick={() => setActiveTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
                {user?.role === "admin" && (
                  <button className="append-btn" onClick={openAddModal}>
                    <span className="append-plus">+</span> Append Resource
                  </button>
                )}
              </div>

              {activeTab === "syllabus" ? (
                <div>
                  <div className="units-head">
                    <div>
                      <div className="units-label">Official Syllabus Units</div>
                      <p className="units-sub">Track your exam preparation progress by checking off units below.</p>
                    </div>
                    {selectedUnits.length > 0 && (
                      <span className="units-progress">{doneCount}/{selectedUnits.length} Completed</span>
                    )}
                  </div>
                  {selectedUnits.length === 0 ? (
                    <div className="tab-empty">Detailed syllabus for this subject is coming soon.</div>
                  ) : (
                    <div className="units-grid">
                      {selectedUnits.map((u, i) => {
                        const done = !!checked[`${selected.code}-${i}`];
                        return (
                          <div className={done ? "unit-card done" : "unit-card"} key={u.title || i}>
                            <button
                              type="button"
                              className={done ? "unit-check checked" : "unit-check"}
                              onClick={() => toggleUnit(selected.code, i)}
                              aria-label="Mark unit complete"
                            >
                              {done && (
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                              )}
                            </button>
                            <h4 className="unit-title">{u.title}</h4>
                            <p className="unit-desc">{u.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="units-label">{activeLabel}</div>
                  {tabMaterials.length === 0 ? (
                    <div className="tab-empty">
                      No {activeLabel} added for {selected.name} yet.
                      {user?.role === "admin" && " Click “Append Resource” to add the first one."}
                    </div>
                  ) : (
                    <div className="resource-list">
                      {tabMaterials.map((m) => (
                        <div className="resource-row" key={m.id}>
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resource-link"
                          >
                            <div className="resource-info">
                              <span className="resource-title">{m.title}</span>
                              <span className="resource-url">{m.url}</span>
                            </div>
                            <span className="resource-open">Open ↗</span>
                          </a>
                          {user?.role === "admin" && (
                            <button
                              className="resource-delete"
                              onClick={() => handleDelete(m.id)}
                              title="Remove resource"
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {isModalOpen && selected && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <span className="modal-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h5l2 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>
                </span>
                <div>
                  <div className="modal-title">Add Subject Resource Material</div>
                  <div className="modal-sub">Subject: {selected.name} ({selected.code})</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-field-label">Material Classification Category</div>
              <div className="modal-cats">
                <button className={formType === "notes" ? "modal-cat active" : "modal-cat"} onClick={() => setFormType("notes")}>Drive Note</button>
                <button className={formType === "playlist" ? "modal-cat active" : "modal-cat"} onClick={() => setFormType("playlist")}>Video/Course</button>
                <button className={formType === "pyq" ? "modal-cat active" : "modal-cat"} onClick={() => setFormType("pyq")}>IPU PYQ Paper</button>
              </div>

              <div className="modal-field-label">Resource Title Name</div>
              <input
                className="modal-input"
                type="text"
                value={formTitle}
                placeholder="e.g., Unit 2 Reference Handouts"
                onChange={(e) => setFormTitle(e.target.value)}
              />

              <div className="modal-field-label">Hyperlink URL Link</div>
              <input
                className="modal-input"
                type="text"
                value={formUrl}
                placeholder="https://drive.google.com/... or https://youtube.com/..."
                onChange={(e) => setFormUrl(e.target.value)}
              />

              {formError && <p className="modal-error">{formError}</p>}

              <div className="modal-divider"></div>

              <div className="modal-actions">
                <button className="modal-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button className="modal-publish" onClick={handlePublish} disabled={submitting}>
                  <span className="append-plus">+</span> {submitting ? "Publishing..." : "Publish Material"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourceHubPage;
