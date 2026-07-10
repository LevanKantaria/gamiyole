import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import classes from "./RequestCard.module.css";
import { useT, useLang, cityLabel, formatDate } from "../../i18n";
import { getProfile, getProfileImage } from "../../services/profile";
import { getVerifiedSet } from "../../services/verification";
import { deleteRequest } from "../../services/requests";
import Avatar from "../UI/Avatar";
import VerifiedBadge from "../UI/VerifiedBadge";

// Cache passenger avatar + phone lookups per uid across cards.
const infoCache = new Map();
const getInfo = (uid) => {
  if (!infoCache.has(uid)) {
    infoCache.set(
      uid,
      Promise.all([getProfileImage(uid), getProfile(uid), getVerifiedSet()])
        .then(([avatar, profile, verifiedSet]) => ({
          avatar,
          number: profile?.number || null,
          verified: verifiedSet.has(uid),
        }))
        .catch(() => ({ avatar: null, number: null, verified: false }))
    );
  }
  return infoCache.get(uid);
};

const RequestCard = ({ request, currentUid, onDeleted }) => {
  const t = useT();
  const lang = useLang();
  const [info, setInfo] = useState({ avatar: null, number: null });
  const isMine = currentUid === request.passengerUid;

  useEffect(() => {
    let mounted = true;
    getInfo(request.passengerUid).then((i) => mounted && setInfo(i));
    return () => {
      mounted = false;
    };
  }, [request.passengerUid]);

  const dateText =
    request.dateFrom === request.dateTo
      ? formatDate(request.dateFrom, lang)
      : `${formatDate(request.dateFrom, lang)} – ${formatDate(request.dateTo, lang)}`;

  const handleDelete = async () => {
    if (!window.confirm(t("deleteRequestConfirm"))) return;
    await deleteRequest(request.id);
    onDeleted?.();
  };

  return (
    <article className={`card fadeUp ${classes.card}`}>
      <div className={classes.top}>
        <div className={classes.route}>
          <span className={classes.city}>{cityLabel(request.from, lang)}</span>
          <span className={classes.arrow}>→</span>
          <span className={classes.city}>{cityLabel(request.to, lang)}</span>
        </div>
        {isMine && <span className="badge badgeGreen">{t("yourRequest")}</span>}
      </div>

      <div className={classes.dates}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {dateText}
      </div>

      {request.note && <p className={classes.note}>{request.note}</p>}

      <div className={classes.bottom}>
        <Link to={`/profile/${request.passengerUid}`} className={classes.passenger}>
          <Avatar src={info.avatar} name={request.name} size={34} />
          <span className={classes.name}>{request.name}</span>
          {info.verified && <VerifiedBadge size={15} />}
        </Link>
        <div className={classes.actions}>
          {isMine ? (
            <button type="button" className="btn btnDanger btnSm" onClick={handleDelete}>
              {t("deleteRequest")}
            </button>
          ) : (
            info.number && (
              <a href={`tel:${info.number}`} className="btn btnPrimary btnSm">
                📞 {t("contactPassenger")}
              </a>
            )
          )}
        </div>
      </div>
    </article>
  );
};

export default RequestCard;
