import { API_URL } from "./api";
import { useState, useEffect, useCallback } from "react";
import { branchNames, branchCodesForScheme } from "./branches"; // CHANGED: scheme-aware list
import { yearSchemes } from "./schemes"; // CHANGED: shared list

// A fresh set of 4 blank syllabus units for the add-subject form.
const blankUnits = () => [
  { title: "", desc: "" },
  { title: "", desc: "" },
  { title: "", desc: "" },
  { title: "", desc: "" },
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

// Turn pasted bulk-import text into a list of subjects. Auto-detects the
// format: JSON (starts with [ or {) carries full units; otherwise each line
// is a "code | name | credits" row (tab- or pipe-separated). Returns the
// parsed subjects plus any per-row error messages for the preview.
function parseBulkInput(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return { subjects: [], errors: [] };

  // --- JSON format (full, with units) ---
  if (trimmed[0] === "[" || trimmed[0] === "{") {
    let data;
    try {
      data = JSON.parse(trimmed);
    } catch (e) {
      return { subjects: [], errors: [`Invalid JSON: ${e.message}`] };
    }
    const arr = Array.isArray(data) ? data : [data];
    const subjects = [];
    const errors = [];
    arr.forEach((s, i) => {
      if (!s || !s.code || !s.name) {
        errors.push(`Item ${i + 1}: missing "code" or "name".`);
        return;
      }
      const units = Array.isArray(s.units)
        ? s.units
            .map((u) => ({
              title: String(u.title || "").trim(),
              desc: String(u.desc || u.description || "").trim(),
            }))
            .filter((u) => u.title || u.desc)
        : [];
      subjects.push({
        code: String(s.code).trim(),
        name: String(s.name).trim(),
        credits: s.credits ?? "",
        units,
      });
    });
    return { subjects, errors };
  }

  // --- Table format (one subject per line: code | name | credits) ---
  const subjects = [];
  const errors = [];
  trimmed.split(/\r?\n/).forEach((line, i) => {
    const raw = line.trim();
    if (!raw) return;
    const parts = raw.split(/\t|\|/).map((p) => p.trim());
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      errors.push(`Line ${i + 1}: need at least "code | name".`);
      return;
    }
    subjects.push({ code: parts[0], name: parts[1], credits: parts[2] || "", units: [] });
  });
  return { subjects, errors };
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

  // Add-subject popup state (admin only)
  const [isSubjModalOpen, setIsSubjModalOpen] = useState(false);
  const [subjCode, setSubjCode] = useState("");
  const [subjName, setSubjName] = useState("");
  const [subjCredits, setSubjCredits] = useState("4");
  const [subjUnits, setSubjUnits] = useState(blankUnits);
  const [subjError, setSubjError] = useState("");
  const [subjSubmitting, setSubjSubmitting] = useState(false);

  // Bulk-import popup state (admin only)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkPreview, setBulkPreview] = useState(null); // { subjects, errors } once previewed
  const [bulkError, setBulkError] = useState("");
  const [bulkResult, setBulkResult] = useState(null); // { inserted, skipped } after import
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

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

  // Load subjects for the current year scheme / branch / semester. Extracted
  // into a callback so we can also re-run it after an admin adds a subject.
  // Pass a code to keep that subject selected after the refresh.
  const loadSubjects = useCallback(
    (selectCode) => {
      setLoadingSubjects(true);
      setSubjectsError("");
      const url = `${API_URL}/subjects?year=${yearScheme}&branch=${branch}&semester=${semester}`;
      return fetch(url)
        .then((res) => res.json())
        .then((data) => {
          const list = data.subjects || [];
          setSubjects(list);
          setSelectedCode((prev) => {
            if (selectCode && list.some((s) => s.code === selectCode)) return selectCode;
            if (prev && list.some((s) => s.code === prev)) return prev; // keep current pick
            return list.length ? list[0].code : ""; // otherwise default to the first
          });
          setLoadingSubjects(false);
        })
        .catch(() => {
          setSubjects([]);
          setSelectedCode("");
          setSubjectsError("Couldn't load subjects — the backend may be waking up. Try again in a moment.");
          setLoadingSubjects(false);
        });
    },
    [yearScheme, branch, semester]
  );

  // Re-load subjects whenever the filters (and therefore loadSubjects) change.
  // loadSubjects flips a loading flag synchronously — an intentional, standard
  // data-fetching pattern, so the set-state-in-effect rule is disabled here.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    loadSubjects();
  }, [loadSubjects]);

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

  function openAddSubjectModal() {
    setSubjCode("");
    setSubjName("");
    setSubjCredits("4");
    setSubjUnits(blankUnits());
    setSubjError("");
    setIsSubjModalOpen(true);
  }

  // Update one field (title or desc) of one unit in the add-subject form
  function updateSubjUnit(index, field, value) {
    setSubjUnits((prev) =>
      prev.map((u, i) => (i === index ? { ...u, [field]: value } : u))
    );
  }

  async function handleAddSubject() {
    setSubjError("");
    if (!subjCode.trim() || !subjName.trim()) {
      setSubjError("Please enter at least a subject code and name.");
      return;
    }
    setSubjSubmitting(true);
    // Keep only units the admin actually filled in (a title or some content)
    const units = subjUnits
      .map((u) => ({ title: u.title.trim(), desc: u.desc.trim() }))
      .filter((u) => u.title || u.desc);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_URL + "/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          year_scheme: yearScheme,
          branch,
          semester,
          code: subjCode.trim(),
          name: subjName.trim(),
          credits: subjCredits,
          units,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubjError(data.error || "Couldn't add the subject. Please try again.");
        setSubjSubmitting(false);
        return;
      }
      await loadSubjects(data.subject?.code); // refresh and open the new subject
      setIsSubjModalOpen(false);
      setSubjSubmitting(false);
    } catch {
      setSubjError("Couldn't reach the server. Is the backend running?");
      setSubjSubmitting(false);
    }
  }

  async function handleDeleteSubject(id) {
    const target = subjects.find((s) => s.id === id);
    const confirmed = window.confirm(
      `Delete ${target ? target.code : "this subject"} and its syllabus? This can't be undone.`
    );
    if (!confirmed) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/subjects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `Couldn't delete (server responded ${res.status}).`);
        return;
      }
      const remaining = subjects.filter((s) => s.id !== id);
      setSubjects(remaining);
      if (target && target.code === selectedCode) {
        setSelectedCode(remaining.length ? remaining[0].code : "");
      }
    } catch {
      alert("Couldn't reach the backend — is it running?");
    }
  }

  function openBulkModal() {
    setBulkText("");
    setBulkPreview(null);
    setBulkError("");
    setBulkResult(null);
    setIsBulkModalOpen(true);
  }

  // Parse the pasted text (without saving) so the admin can review the rows
  function handleBulkPreview() {
    setBulkError("");
    setBulkResult(null);
    setBulkPreview(parseBulkInput(bulkText));
  }

  async function handleBulkImport() {
    const parsed = bulkPreview || parseBulkInput(bulkText);
    if (parsed.subjects.length === 0) {
      setBulkError("Nothing to import — paste some subjects and click Preview first.");
      return;
    }
    setBulkSubmitting(true);
    setBulkError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_URL + "/subjects/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          year_scheme: yearScheme,
          branch,
          semester,
          subjects: parsed.subjects,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkError(data.error || "Couldn't import the subjects.");
        setBulkSubmitting(false);
        return;
      }
      setBulkResult({ inserted: data.inserted, skipped: data.skipped });
      setBulkSubmitting(false);
      await loadSubjects(); // refresh the catalog with the new subjects
    } catch {
      setBulkError("Couldn't reach the server. Is the backend running?");
      setBulkSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="hub-filter">
        <div className="filter-group">
          <span className="filter-label">Syllabus Scheme</span>
          <select
            value={yearScheme}
            onChange={(e) => {
              const next = e.target.value;
              setYearScheme(next);
              // CSAI/CSDS don't exist before 2024 — if the current branch
              // isn't offered in the new scheme, fall back to the first one.
              const allowed = branchCodesForScheme(next);
              if (!allowed.includes(branch)) setBranch(allowed[0]);
            }}
          >
            {yearSchemes.map((y) => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-divider"></div>

        <div className="filter-group">
          <span className="filter-label">USICT Branch</span>
          <div className="branch-tabs">
            {branchCodesForScheme(yearScheme).map((b) => (
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
          {user?.role === "admin" && (
            <div className="cat-admin-actions">
              <button className="cat-add-btn" onClick={openAddSubjectModal}>
                <span className="append-plus">+</span> Add New Subject
              </button>
              <button className="cat-bulk-btn" onClick={openBulkModal}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9M8 17l4 4 4-4"/></svg>
                Bulk Import
              </button>
            </div>
          )}
          <div className="cat-list">
            {loadingSubjects ? (
              [0, 1, 2, 3, 4].map((i) => (
                <div className="skeleton-card" key={i}>
                  <div className="skeleton-line skeleton-code" />
                  <div className="skeleton-line skeleton-name" />
                </div>
              ))
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
                {user?.role === "admin" && (
                  <button
                    className="subject-delete"
                    onClick={() => handleDeleteSubject(selected.id)}
                    title="Delete this subject"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>
                    Delete Subject
                  </button>
                )}
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

      {isSubjModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSubjModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <span className="modal-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </span>
                <div>
                  <div className="modal-title">Add New Subject</div>
                  <div className="modal-sub">
                    {branchNames[branch]} · Semester {semester} ·{" "}
                    {yearSchemes.find((y) => y.id === yearScheme)?.label}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsSubjModalOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="subj-form-row">
                <div className="subj-form-col">
                  <div className="modal-field-label">Subject Code</div>
                  <input
                    className="modal-input"
                    type="text"
                    value={subjCode}
                    placeholder="e.g., ICT-201"
                    onChange={(e) => setSubjCode(e.target.value)}
                  />
                </div>
                <div className="subj-form-col subj-credits-col">
                  <div className="modal-field-label">Credits</div>
                  <select value={subjCredits} onChange={(e) => setSubjCredits(e.target.value)}>
                    {["1", "2", "3", "4", "5", "6"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-field-label">Subject Name</div>
              <input
                className="modal-input"
                type="text"
                value={subjName}
                placeholder="e.g., Foundations of Computer Science"
                onChange={(e) => setSubjName(e.target.value)}
              />

              <div className="modal-divider"></div>
              <div className="modal-field-label">Syllabus Units — fill what you have, leave the rest blank</div>

              {subjUnits.map((u, i) => {
                const roman = ["I", "II", "III", "IV"][i];
                return (
                  <div className="unit-form" key={i}>
                    <div className="unit-form-head">Unit {roman}</div>
                    <input
                      className="modal-input"
                      type="text"
                      value={u.title}
                      placeholder={`Unit ${roman} title — e.g., Arrays & Stacks`}
                      onChange={(e) => updateSubjUnit(i, "title", e.target.value)}
                    />
                    <textarea
                      className="modal-textarea"
                      value={u.desc}
                      placeholder="What this unit covers…"
                      onChange={(e) => updateSubjUnit(i, "desc", e.target.value)}
                    />
                  </div>
                );
              })}

              {subjError && <p className="modal-error">{subjError}</p>}

              <div className="modal-divider"></div>

              <div className="modal-actions">
                <button className="modal-cancel" onClick={() => setIsSubjModalOpen(false)}>Cancel</button>
                <button className="modal-publish" onClick={handleAddSubject} disabled={subjSubmitting}>
                  <span className="append-plus">+</span> {subjSubmitting ? "Adding..." : "Add Subject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <div className="modal-overlay" onClick={() => setIsBulkModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <span className="modal-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9M8 17l4 4 4-4"/></svg>
                </span>
                <div>
                  <div className="modal-title">Bulk Import Subjects</div>
                  <div className="modal-sub">
                    Into: {branchNames[branch]} · Semester {semester} ·{" "}
                    {yearSchemes.find((y) => y.id === yearScheme)?.label}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsBulkModalOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="modal-body">
              <p className="bulk-help">
                Paste a <strong>table</strong> (one per line: <code>code | name | credits</code>) or a
                {" "}<strong>JSON array</strong> of <code>{"{ code, name, credits, units }"}</code> — the format
                is auto-detected. Subjects go into the scheme, branch &amp; semester shown above.
              </p>
              <textarea
                className="modal-textarea bulk-textarea"
                value={bulkText}
                placeholder={"ICT-201 | Foundations of Computer Science | 4\nICT-203 | Database Management Systems | 3\n\n…or paste a JSON array of { code, name, credits, units }"}
                onChange={(e) => {
                  setBulkText(e.target.value);
                  setBulkPreview(null);
                  setBulkResult(null);
                }}
              />

              {bulkError && <p className="modal-error">{bulkError}</p>}

              {bulkPreview && !bulkResult && (
                <div className="bulk-preview">
                  <div className="bulk-preview-head">
                    {bulkPreview.subjects.length} subject{bulkPreview.subjects.length === 1 ? "" : "s"} ready
                    {bulkPreview.errors.length > 0 &&
                      ` · ${bulkPreview.errors.length} row${bulkPreview.errors.length === 1 ? "" : "s"} skipped`}
                  </div>
                  {bulkPreview.subjects.length > 0 && (
                    <ul className="bulk-preview-list">
                      {bulkPreview.subjects.map((s, i) => (
                        <li key={i}>
                          <span className="bulk-code">{s.code}</span> {s.name}
                          {s.credits !== "" && <span className="bulk-meta"> · {s.credits} cr</span>}
                          {s.units.length > 0 && <span className="bulk-meta"> · {s.units.length} units</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {bulkPreview.errors.length > 0 && (
                    <ul className="bulk-preview-errors">
                      {bulkPreview.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {bulkResult && (
                <div className="bulk-success">
                  ✓ Imported {bulkResult.inserted} subject{bulkResult.inserted === 1 ? "" : "s"}
                  {bulkResult.skipped > 0 &&
                    `, skipped ${bulkResult.skipped} duplicate${bulkResult.skipped === 1 ? "" : "s"}`}
                  .
                </div>
              )}

              <div className="modal-divider"></div>

              <div className="modal-actions">
                <button className="modal-cancel" onClick={() => setIsBulkModalOpen(false)}>
                  {bulkResult ? "Done" : "Cancel"}
                </button>
                {!bulkResult && (
                  <>
                    <button className="modal-cancel" onClick={handleBulkPreview} disabled={!bulkText.trim()}>
                      Preview
                    </button>
                    <button
                      className="modal-publish"
                      onClick={handleBulkImport}
                      disabled={bulkSubmitting || !bulkText.trim()}
                    >
                      {bulkSubmitting
                        ? "Importing…"
                        : `Import${bulkPreview ? " " + bulkPreview.subjects.length : ""}`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourceHubPage;
