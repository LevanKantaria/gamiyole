import { Link } from "react-router-dom";
import classes from "./Footer.module.css";
import { useT } from "../../i18n";
import TopCounter from "./TopCounter";

const Footer = () => {
  const t = useT();
  return (
    <footer className={classes.footer}>
      <div className={`container ${classes.inner}`}>
        <div>
          <div className={classes.brand}>gamiyole</div>
          <p className={classes.tag}>{t("footerTag")}</p>
        </div>
        <div className={classes.meta}>
          <a href="mailto:info@gamiyole.me">info@gamiyole.me</a>
          <Link to="/privacy" className={classes.policyLink}>
            {t("privacyPolicy")}
          </Link>
          <span>
            © {new Date().getFullYear()} Gamiyole · {t("allRights")}
          </span>
          <TopCounter />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
