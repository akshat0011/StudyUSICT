function Logo() {
  return (
    <div className="logo">
      <svg width="34" height="34" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" fill="#4f46e5" />
        <path d="M20 11.5 L31.5 16 L20 20.5 L8.5 16 Z" fill="#ffffff" />
        <path
          d="M13.5 18 V22.5 C13.5 24.4 16.4 25.8 20 25.8 C23.6 25.8 26.5 24.4 26.5 22.5 V18"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M31.5 16 V22" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="31.5" cy="23.2" r="1.7" fill="#ffffff" />
      </svg>
      <span className="logo-text">
        Study<span className="logo-accent">IPU</span>
      </span>
    </div>
  );
}

export default Logo;