import { useState, useEffect } from "react";

function MaterialsPage({ user }) {  // NEW: receives the logged-in user as a prop
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // NEW: state for the add-material form
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("notes");
  const [url, setUrl] = useState("");
  const [formMessage, setFormMessage] = useState("");

  // CHANGED: pulled the fetch into its own function so we can call it again after adding
  async function loadMaterials() {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("http://localhost:3000/materials", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setMaterials(data.materials);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  // NEW: handle submitting the add-material form
  async function handleAdd(event) {
    event.preventDefault();
    setFormMessage("");

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
        setFormMessage(data.error);
        return;
      }

      setTitle("");
      setSubject("");
      setUrl("");
      setFormMessage("Material added!");
      loadMaterials(); // refresh the list so the new one shows
    } catch (err) {
      setFormMessage("Could not reach the server.");
    }
  }

  if (loading) {
    return <p>Loading materials...</p>;
  }

  return (
    <div>
      <h2>Study Materials</h2>

      {/* NEW: only admins see this form */}
      {user?.role === "admin" && (
        <form onSubmit={handleAdd}>
          <h3>Add a material</h3>
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="notes">Notes</option>
            <option value="pyq">PYQ</option>
            <option value="playlist">Playlist</option>
          </select>
          <input
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit">Add</button>
          <p>{formMessage}</p>
        </form>
      )}

      {materials.length === 0 ? (
        <p>No materials yet.</p>
      ) : (
        <ul>
          {materials.map((material) => (
            <li key={material.id}>
              <strong>{material.title}</strong> — {material.subject} ({material.type})
              <br />
              <a href={material.url} target="_blank" rel="noreferrer">
                Open
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MaterialsPage;