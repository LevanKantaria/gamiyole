import { useEffect, useState } from "react";
import { useHistory, Link } from "react-router-dom";
import classes from "./HomePage.module.css";
import { useT, useLang, cityLabel } from "../../i18n";
import { subscribeUpcomingRides, todayISO } from "../../services/rides";
import { subscribeExternalRides } from "../../services/external";
import SearchBar from "../Rides/SearchBar";
import RideList from "../Rides/RideList";
import RideSkeleton from "../Rides/RideSkeleton";

const HowItWorksIcon = ({ path }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const POPULAR_ROUTES = [
  ["Tbilisi", "Batumi"],
  ["Tbilisi", "Kutaisi"],
  ["Tbilisi", "Zugdidi"],
  ["Tbilisi", "Gori"],
  ["Batumi", "Kutaisi"],
  ["Tbilisi", "Telavi"],
];

const STEP_ICONS = [
  "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.35-4.35", // search
  "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", // check circle
  "M17 20h5v-2a3 3 0 0 0-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 0 1 5.36-1.86M7 20v-2c0-.66.13-1.28.36-1.86m0 0a5 5 0 0 1 9.28 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z", // people
];

const HomePage = () => {
  const t = useT();
  const lang = useLang();
  const history = useHistory();
  const [rides, setRides] = useState(null);
  const [external, setExternal] = useState([]);
  const [search, setSearch] = useState({
    departure: "",
    destination: "",
    when: "any",
    date: todayISO(),
  });

  useEffect(() => subscribeUpcomingRides(setRides), []);
  useEffect(() => subscribeExternalRides(setExternal), []);

  const goSearch = () => {
    const params = new URLSearchParams();
    if (search.departure) params.set("from", search.departure);
    if (search.destination) params.set("to", search.destination);
    if (search.when !== "any") params.set("when", search.when);
    if (search.when === "date" && search.date) params.set("date", search.date);
    history.push(`/find?${params.toString()}`);
  };

  const preview = [...(rides || []), ...external]
    .sort(
      (a, b) =>
        (a.date || "").localeCompare(b.date || "") ||
        (a.departureTime || "").localeCompare(b.departureTime || "")
    )
    .slice(0, 5);

  return (
    <>
      <section className={classes.hero}>
        <div className={`container ${classes.heroInner}`}>
          <h1 className={classes.title}>{t("heroTitle")}</h1>
          <p className={classes.subtitle}>{t("heroSubtitle")}</p>
          <div className={classes.searchWrap}>
            <SearchBar values={search} onChange={setSearch} onSubmit={goSearch} allowAny />
          </div>
          <div className={classes.heroActions}>
            <Link to="/publish" className={classes.driveLink}>
              {t("heroDrive")} →
            </Link>
          </div>
        </div>
      </section>

      <section className={`container ${classes.section}`}>
        <div className={classes.sectionHead}>
          <h2>{t("upcomingRides")}</h2>
          <Link to="/find">{t("findRide")} →</Link>
        </div>
        {rides === null ? <RideSkeleton /> : <RideList rides={preview} />}
      </section>

      <section className={`container ${classes.section}`}>
        <h2 className={classes.center}>{t("howTitle")}</h2>
        <div className={classes.steps}>
          {[1, 2, 3].map((n, i) => (
            <div key={n} className={`card ${classes.step}`}>
              <div className={classes.stepIcon}>
                <HowItWorksIcon path={STEP_ICONS[i]} />
              </div>
              <h3 className={classes.stepTitle}>{t(`how${n}Title`)}</h3>
              <p className={classes.stepText}>{t(`how${n}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`container ${classes.section}`}>
        <h2 className={classes.center}>{t("popularRoutes")}</h2>
        <div className={classes.routes}>
          {POPULAR_ROUTES.map(([from, to]) => (
            <Link
              key={`${from}-${to}`}
              to={`/find?from=${from}&to=${to}`}
              className={classes.routeChip}
            >
              {cityLabel(from, lang)} → {cityLabel(to, lang)}
            </Link>
          ))}
        </div>
      </section>

      <section className={`container ${classes.section}`}>
        <div className={classes.trust}>
          <div className={classes.trustStars}>★★★★★</div>
          <h2>{t("trustTitle")}</h2>
          <p>{t("trustText")}</p>
        </div>
      </section>

      <section className={`container ${classes.section}`}>
        <div className={classes.appPromo}>
          <div className={classes.appPromoText}>
            <h2>{t("appPromoTitle")}</h2>
            <p>{t("appPromoText")}</p>
            <div className={classes.storeBadges}>
              {/* Placeholders — swap for real store links once the apps ship. */}
              <span className={classes.storeBadge} aria-disabled="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <span>
                  <small>{t("comingSoon")}</small>
                  App Store
                </span>
              </span>
              <span className={classes.storeBadge} aria-disabled="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3.6 1.8c-.3.3-.5.8-.5 1.4v17.6c0 .6.2 1.1.5 1.4l.1.1 9.9-9.9v-.2L3.7 1.7l-.1.1zm13.2 13.3-3.3-3.3v-.2l3.3-3.3.1 0 3.9 2.2c1.1.6 1.1 1.7 0 2.3l-3.9 2.2-.1.1zm-.1.1-3.4-3.4-9.9 9.9c.4.4 1 .4 1.7 0l11.6-6.5zM3.4 1.6l9.9 9.9 3.4-3.4L5.1 1.6c-.7-.4-1.3-.4-1.7 0z" />
                </svg>
                <span>
                  <small>{t("comingSoon")}</small>
                  Google Play
                </span>
              </span>
            </div>
          </div>
          <div className={classes.appPromoArt} aria-hidden="true">
            📱
          </div>
        </div>
      </section>

      <section className={`container ${classes.section}`}>
        <h2 className={classes.center}>{t("faqTitle")}</h2>
        <div className={classes.faq}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <details key={n} className={`card ${classes.faqItem}`}>
              <summary className={classes.faqQuestion}>{t(`faq${n}q`)}</summary>
              <p className={classes.faqAnswer}>{t(`faq${n}a`)}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
};

export default HomePage;
