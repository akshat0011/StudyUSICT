import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";

const filters = [
  { label: "All", value: "all" },
  { label: "Notes", value: "notes" },
  { label: "PYQs", value: "pyq" },
  { label: "Videos", value: "playlist" },
];

function typeLabel(type) {
  if (type === "pyq") return "PYQ";
  if (type === "playlist") return "Video";
  return "Notes";
}

function MaterialsPage({ user }) {
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = searchParams.get("type") || "all";

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("notes");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");

  async function loadMaterials() {
    try {
      const response = await fetch("http://localhost:3000/materials");
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.materials || []);
      setMaterials(list);
    } catch (err) {
      setMessage("Could not load materials. Is the server running?");
    }
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  async function handleAdd(event) {
    event.preventDefault();
    setMessage("");
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("http://localhost:3000/materials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, subject, type, url }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Could not add material.");
        return;
      }
      setTitle("");
      setSubject("");
      setUrl("");
      loadMaterials();
    } catch (err) {
      setMessage("Could not add material.");
    }
  }

  const visibleMaterials = materials.filter((m) => {
    const matchesType = activeType === "all" || m.type === activeType;
    const text = search.toLowerCase();
    const matchesSearch =
      text === "" ||
      (m.title || "").toLowerCase().includes(text) ||
      (m.subject || "").toLowerCase().includes(text);
    return matchesType && matchesSearch;
  });

  return (
    <div className="container materials-page">
      <h1 className="materials-title">Study Materials</h1>

      <div className="filter-tabs">
        {filters.map((f) => (
          <button
            key={f.value}
            className={activeType === f.value ? "filter-tab active" : "filter-tab"}
            onClick={() => setSearchParams(f.value === "all" ? {} : { type: f.value })}
          >
            {f.label}
          </button>
        ))}
      </div>

      <input
        className="materials-search"
        placeholder="Search by subject or title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {user?.role === "admin" && (
        <form className="add-form" onSubmit={handleAdd}>
          <h3>Add a material</h3>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="notes">Notes</option>
            <option value="pyq">PYQ</option>
            <option value="playlist">Video playlist</option>
          </select>
          <input placeholder="URL (link to the file or playlist)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="submit">Add material</button>
        </form>
      )}

      {message && <p className="auth-message">{message}</p>}

      <div className="materials-grid">
        {visibleMaterials.map((m) => (
          <a
            key={m.id}
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="material-card"
          >
            <span className="material-type">{typeLabel(m.type)}</span>
            <h3>{m.title}</h3>
            <p>{m.subject}</p>
          </a>
        ))}
      </div>

      {visibleMaterials.length === 0 && (
        <p className="empty-note">No materials here yet.</p>
      )}
    </div>
  );
}

export default MaterialsPage;