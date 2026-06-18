import { Link } from "react-router";
import usictImage from "./assets/usict.webp";

const sections = [
  {
    title: "Notes",
    desc: "Subject-wise notes and summaries for every semester.",
    to: "/materials?type=notes",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>,
  },
  {
    title: "PYQs",
    desc: "Previous year question papers to practice with.",
    to: "/materials?type=pyq",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="13" height="13" rx="2"/><path d="M3 8v11a2 2 0 0 0 2 2h11"/></svg>,
  },
  {
    title: "Subject-wise",
    desc: "Browse everything organized by branch and subject.",
    to: "/materials",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    title: "Video Lectures",
    desc: "Curated YouTube playlists for each topic.",
    to: "/materials?type=playlist",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4z" fill="currentColor" stroke="none"/></svg>,
  },
  {
    title: "Job Opportunities",
    desc: "Off-campus internships and job openings, updated often.",
    to: "/",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  },
  {
    title: "Results",
    desc: "Quick access to the official IPU result portal.",
    to: "/",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5"/></svg>,
  },
];

function HomePage() {
  return (
    <div className="container">
      <section className="hero">
        <span className="hero-eyebrow">Built for USICT • All branches and semesters</span>
        <h1 className="hero-title">
          Everything you need to ace every semester at <span className="accent">USICT</span>.
        </h1>
        <p className="hero-subtitle">
          Notes, previous year papers, curated video lectures, and off-campus internship
          and job openings — organized by subject and semester, all in one place.
          Made by USICT students, for USICT students.
        </p>
      </section>

      <section className="sections-grid">
        {sections.map((section) => (
          <Link to={section.to} key={section.title} className="section-card">
            <div className="card-icon">{section.icon}</div>
            <h3>{section.title}</h3>
            <p>{section.desc}</p>
          </Link>
        ))}
      </section>

      <section className="about">
        <div className="about-text">
          <h2>Built by students who've been there</h2>
          <p>
            Finding good notes, last year's papers, and the right lectures for USICT
            usually means digging through scattered WhatsApp groups and seniors' Drive
            links. StudyUSICT puts it all in one place — sorted by branch and semester,
            and free for everyone.
          </p>
          <p>
            We also track off-campus internships and job openings, because building
            your career shouldn't wait until final year.
          </p>
          <ul className="about-points">
            <li>Free forever — no paywalls, no login needed to browse</li>
            <li>Every branch and every semester at USICT</li>
            <li>Notes, PYQs, video lectures, and jobs in one hub</li>
          </ul>
        </div>
        <div className="about-image">
          <img src={usictImage} alt="USICT" /> {/* CHANGED: was the Unsplash URL */}
        </div>
      </section>
    </div>
  );
}

export default HomePage;