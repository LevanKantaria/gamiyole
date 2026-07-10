import classes from "./ExternalRideCard.module.css";
import { useT, useLang, cityLabel } from "../../i18n";

// A ride offer surfaced from a public Facebook group (see services/external.js).
// Visually distinct from real gamiyole rides: not bookable, no driver profile,
// no republished contact details — just the route and a link out to the
// original post, clearly flagged as unverified.
const ExternalRideCard = ({ ride }) => {
  const t = useT();
  const lang = useLang();
  const seats = parseInt(ride.seats, 10);

  return (
    <article className={`card fadeUp ${classes.card}`}>
      <span className={classes.accent} aria-hidden="true" />

      <div className={classes.top}>
        <div className={classes.route}>
          <div className={classes.stop}>
            {ride.departureTime && <span className={classes.time}>{ride.departureTime}</span>}
            <span className={classes.dot} />
            <span className={classes.city}>{cityLabel(ride.departure, lang)}</span>
          </div>
          <div className={classes.lineWrap}>
            <span className={classes.line} />
          </div>
          <div className={classes.stop}>
            {ride.departureTime && <span className={classes.time} aria-hidden="true" />}
            <span className={`${classes.dot} ${classes.dotEnd}`} />
            <span className={classes.city}>{cityLabel(ride.destination, lang)}</span>
          </div>
        </div>

        <span className={classes.sourceBadge}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z" />
          </svg>
          {t("externalBadge")}
        </span>
      </div>

      {Number.isFinite(seats) && seats > 0 && (
        <p className={classes.seats}>
          {seats} {t("externalSeats")}
        </p>
      )}

      {ride.text && <p className={classes.postText}>“{ride.text}”</p>}

      <div className={classes.bottom}>
        <p className={classes.note}>{t("externalNote")}</p>
        {ride.sourceUrl && (
          <a
            href={ride.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={`btn btnGhost btnSm ${classes.viewBtn}`}
          >
            {ride.linkType === "group" ? t("externalViewGroup") : t("externalViewPost")} ↗
          </a>
        )}
      </div>
    </article>
  );
};

export default ExternalRideCard;
