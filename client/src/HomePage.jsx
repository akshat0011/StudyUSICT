import { Link } from "react-router";

const sections = [
  { title: "Notes", desc: "Subject-wise notes and summaries to study from.", to: "/materials" },
  { title: "PYQs", desc: "Previous year papers to practice with.", to: "/materials" },
  { title: "Subject-wise", desc: "Everything organized by your subjects.", to: "/materials" },
  { title: "Video Lectures", desc: "Curated YouTube playlists for each topic.", to: "/materials" },
  { title: "Job Opportunities", desc: "Internships and placements for IPU students.", to: "/" },
  { title: "Results", desc: "Quick access to the official IPU result portal.", to: "/" },
];

function HomePage({ user }) {
  return (
    <div>
      <section className="hero">
        <h1 className="hero-title">Everything you need to ace your semester at IPU.</h1>
        <p className="hero-subtitle">
          Notes, previous year papers, video lectures, and placement openings —
          organized by subject, all in one place. Built by IPU students, for IPU students.
        </p>
        {!user && (
          <Link to="/login" className="hero-cta">Get started</Link>
        )}
      </section>

      <section className="sections-grid">
        {sections.map((section) => (
          <Link to={section.to} key={section.title} className="section-card">
            <h3>{section.title}</h3>
            <p>{section.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

export default HomePage;