import { API_URL } from "./api";
import { useState, useEffect } from "react";

// Turns a saved timestamp into "2 days ago", "last week", etc.
function timeAgo(dateString) {
  if (!dateString) return "Recently";
  let then = new Date(dateString.replace(" ", "T") + "Z");
  if (isNaN(then.getTime())) then = new Date(dateString);
  if (isNaN(then.getTime())) return "Recently";
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "last week";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months <= 1) return "last month";
  if (months < 12) return `${months} months ago`;
  return "over a year ago";
}

function CareersPage({ user }) {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState("internship");
  const [formTitle, setFormTitle] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formSalary, setFormSalary] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(API_URL + "/jobs")
      .then((res) => res.json())
      .then((data) => setJobs(Array.isArray(data) ? data : data.jobs || []))
      .catch(() => {});
  }, []);

  const filteredJobs = jobs.filter((job) => {
    const matchesFilter = filter === "all" || job.type === filter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      (job.tags || "").toLowerCase().includes(q) ||
      (job.description || "").toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  function openModal() {
    setFormType("internship");
    setFormTitle("");
    setFormCompany("");
    setFormDesc("");
    setFormLocation("");
    setFormSalary("");
    setFormUrl("");
    setFormTags("");
    setFormError("");
    setIsModalOpen(true);
  }

  async function handlePost() {
    setFormError("");
    if (!formTitle.trim() || !formCompany.trim()) {
      setFormError("Job title and company are required.");
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_URL + "/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          company: formCompany.trim(),
          type: formType,
          description: formDesc.trim(),
          location: formLocation.trim(),
          salary: formSalary.trim(),
          url: formUrl.trim(),
          tags: formTags.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Could not post the job. Please try again.");
        setSubmitting(false);
        return;
      }
      setJobs((prev) => [data, ...prev]);
      setIsModalOpen(false);
      setSubmitting(false);
    } catch {
      setFormError("Couldn't reach the server. Is the backend running?");
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this job post? This can't be undone.");
    if (!confirmed) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/jobs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `Couldn't delete (server responded ${res.status}).`);
        return;
      }
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch {
      alert("Couldn't reach the backend — is it running?");
    }
  }

  return (
    <div className="page">
      <div className="jobs-hero">
        <span className="jobs-hero-badge">Jobs Tracker</span>
        <h1 className="jobs-hero-title">Off-Campus Placements &amp; Internships Board</h1>
        <p className="jobs-hero-text">
          Curated list of tech opportunities for USICT students. Skip the generic portals and view active SDE tracks from core product firms, complete with standard roadmap milestones.
        </p>
      </div>

      <div className="jobs-toolbar">
        <div className="jobs-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder="Search SDE, Frontend, Internships or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="jobs-filters">
          <button className={filter === "all" ? "jobs-filter active" : "jobs-filter"} onClick={() => setFilter("all")}>All</button>
          <button className={filter === "internship" ? "jobs-filter active" : "jobs-filter"} onClick={() => setFilter("internship")}>Internship</button>
          <button className={filter === "fulltime" ? "jobs-filter active" : "jobs-filter"} onClick={() => setFilter("fulltime")}>Full-Time</button>
        </div>
        {user?.role === "admin" && (
          <button className="post-job-btn" onClick={openModal}>
            <span className="append-plus">+</span> Post Job
          </button>
        )}
      </div>

      {filteredJobs.length === 0 ? (
        <div className="jobs-empty">
          No job openings to show yet.
          {user?.role === "admin" && " Click “Post Job” to add the first one."}
        </div>
      ) : (
        <div className="jobs-list">
          {filteredJobs.map((job) => {
            const tags = (job.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
            return (
              <div className="job-card" key={job.id}>
                <div className="job-main">
                  <div className="job-badges">
                    <span className="job-company">{job.company}</span>
                    <span className={job.type === "internship" ? "job-type intern" : "job-type fulltime"}>
                      {job.type === "internship" ? "Internship" : "Full-Time"}
                    </span>
                  </div>
                  <h3 className="job-title">{job.title}</h3>
                  {job.description && <p className="job-desc">{job.description}</p>}
                  <div className="job-meta">
                    {job.location && (
                      <span className="job-loc">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {job.location}
                      </span>
                    )}
                    {job.salary && (
                      <span className="job-salary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        {job.salary}
                      </span>
                    )}
                    <span className="job-posted">Posted {timeAgo(job.created_at)}</span>
                  </div>
                  {tags.length > 0 && (
                    <div className="job-tags">
                      {tags.map((t) => (
                        <span className="job-tag" key={t}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="job-actions">
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="job-apply">
                      Apply Externally
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
                    </a>
                  )}
                  {user?.role === "admin" && (
                    <button className="job-delete" onClick={() => handleDelete(job.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>
                      Delete Post
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <span className="modal-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </span>
                <div>
                  <div className="modal-title">Post a Job Opening</div>
                  <div className="modal-sub">Add an off-campus role for USICT students.</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-field-label">Role Type</div>
              <div className="modal-cats">
                <button className={formType === "internship" ? "modal-cat active" : "modal-cat"} onClick={() => setFormType("internship")}>Internship</button>
                <button className={formType === "fulltime" ? "modal-cat active" : "modal-cat"} onClick={() => setFormType("fulltime")}>Full-Time</button>
              </div>

              <div className="modal-field-label">Job Title</div>
              <input className="modal-input" type="text" value={formTitle} placeholder="e.g., Software Dev Engineer (SDE) Intern" onChange={(e) => setFormTitle(e.target.value)} />

              <div className="modal-field-label">Company</div>
              <input className="modal-input" type="text" value={formCompany} placeholder="e.g., Amazon India" onChange={(e) => setFormCompany(e.target.value)} />

              <div className="modal-field-label">Description</div>
              <textarea className="modal-textarea" value={formDesc} placeholder="What the role involves, eligibility, requirements..." onChange={(e) => setFormDesc(e.target.value)} />

              <div className="modal-field-label">Location</div>
              <input className="modal-input" type="text" value={formLocation} placeholder="e.g., Bangalore / Remote" onChange={(e) => setFormLocation(e.target.value)} />

              <div className="modal-field-label">Salary / Stipend</div>
              <input className="modal-input" type="text" value={formSalary} placeholder="e.g., ₹80,000 / month" onChange={(e) => setFormSalary(e.target.value)} />

              <div className="modal-field-label">Apply Link (URL)</div>
              <input className="modal-input" type="text" value={formUrl} placeholder="https://..." onChange={(e) => setFormUrl(e.target.value)} />

              <div className="modal-field-label">Tags (comma-separated)</div>
              <input className="modal-input" type="text" value={formTags} placeholder="e.g., SDE Intern, C++, Java, DSA" onChange={(e) => setFormTags(e.target.value)} />

              {formError && <p className="modal-error">{formError}</p>}

              <div className="modal-divider"></div>

              <div className="modal-actions">
                <button className="modal-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button className="modal-publish" onClick={handlePost} disabled={submitting}>
                  <span className="append-plus">+</span> {submitting ? "Posting..." : "Post Job"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CareersPage;