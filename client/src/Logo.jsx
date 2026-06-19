import { Link } from "react-router";
import logoLight from "./assets/logo.png";
import logoDark from "./assets/logo-dark.png";

function Logo() {
  return (
    <Link to="/" className="logo-link">
      <img src={logoLight} alt="StudyUSICT" className="logo-img logo-light" />
      <img src={logoDark} alt="StudyUSICT" className="logo-img logo-dark" />
    </Link>
  );
}

export default Logo;