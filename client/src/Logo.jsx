import logo from "./assets/logo.png";

function Logo() {
  return (
    <div className="logo">
      <img src={logo} alt="StudyUSICT" className="logo-img" />
      <div>
        <div className="logo-text">Study<span className="accent">USICT</span></div>
      </div>
    </div>
  );
}

export default Logo;