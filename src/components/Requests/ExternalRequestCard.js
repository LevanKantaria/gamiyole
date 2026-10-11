import classes from "./ExternalRequestCard.module.css";
import { useT, useLang, cityLabel, formatDate } from "../../i18n";

const ExternalRequestCard = ({ request }) => {
  const t = useT();
  const lang = useLang();
  const origin = cityLabel(request.from, lang);
  const destination = cityLabel(request.to, lang);

  return (
    <article className={`card fadeUp ${classes.card}`}>
      <div className={classes.top}>
        <strong>{origin} → {destination}</strong>
        <span className={classes.badge}>{t("externalBadge")}</span>
      </div>
      <div className={classes.date}>
        {formatDate(request.dateFrom, lang)}
        {request.departureTime ? ` · ${request.departureTime}` : ""}
      </div>
      {request.note && <p className={classes.postText}>“{request.note}”</p>}
      <div className={classes.bottom}>
        <p>{t("externalRequestNote")}</p>
        {request.sourceUrl && <a href={request.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn btnGhost btnSm">
          {request.linkType === "group" ? t("externalViewGroup") : t("externalViewPost")} ↗
        </a>}
      </div>
    </article>
  );
};

export default ExternalRequestCard;
