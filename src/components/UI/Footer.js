import { Link } from "react-router-dom";
import classes from "./Footer.module.css";
import { useSelector } from "react-redux";

const Footer = () => {
  const lang = useSelector((state) => state.lang.lang);

  const txt = {
    EN: {
      description:
        "Gamiyole helps drivers and passengers share intercity rides with safer, cheaper, and more comfortable travel.",
      explore: "Explore",
      about: "About",
      findRides: "Find rides",
      publishRide: "Publish",
      contact: "Contact",
      profile: "Profile",
      email: "contact@gamiyole.com",
      rights: "All rights reserved.",
    },
    GE: {
      description:
        "Gamiyole გაძლევს საშუალებას მძღოლებმა და მგზავრებმა ქალაქებს შორის მგზავრობა უფრო იაფად და კომფორტულად გააზიარონ.",
      explore: "ნავიგაცია",
      about: "შესახებ",
      findRides: "მოძებნე",
      publishRide: "ატვირთე",
      contact: "კონტაქტი",
      profile: "პროფილი",
      email: "contact@gamiyole.com",
      rights: "ყველა უფლება დაცულია.",
    },
  };

  const id = localStorage.getItem("localId");
  const profilePath = id ? `/profile/${id}` : "/welcome";

  return (
    <footer className={classes.footer}>
      <div className={classes.container}>
        <section className={classes.brand}>
          <h3>Gamiyole</h3>
          <p>{txt[lang].description}</p>
        </section>

        <section className={classes.links}>
          <h4>{txt[lang].explore}</h4>
          <Link to="/about">{txt[lang].about}</Link>
          <Link to="/find">{txt[lang].findRides}</Link>
          <Link to="/submit">{txt[lang].publishRide}</Link>
          <Link to={profilePath}>{txt[lang].profile}</Link>
        </section>

        <section className={classes.links}>
          <h4>{txt[lang].contact}</h4>
          <a href={`mailto:${txt[lang].email}`}>{txt[lang].email}</a>
        </section>
      </div>

      <div className={classes.bottom}>
        <span>© {new Date().getFullYear()} Gamiyole. {txt[lang].rights}</span>
      </div>
    </footer>
  );
};

export default Footer;
