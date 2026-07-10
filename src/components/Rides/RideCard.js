import { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import classes from "./RideCard.module.css";
import { useT, useLang, cityLabel, RIDE_BADGES } from "../../i18n";
import { seatsLeft, cancelRide } from "../../services/rides";
import { bookRide, cancelBooking } from "../../services/bookings";
import { getProfileImage } from "../../services/profile";
import { getRatingSummary } from "../../services/ratings";
import { getVerifiedSet } from "../../services/verification";
import Avatar from "../UI/Avatar";
import StarRating from "../UI/StarRating";
import VerifiedBadge from "../UI/VerifiedBadge";

// Avatar/rating lookups are cached per driver so a list of rides by the same
// driver doesn't refetch the same data for every card.
const driverInfoCache = new Map();
const getDriverInfo = (uid) => {
  if (!driverInfoCache.has(uid)) {
    driverInfoCache.set(
      uid,
      Promise.all([getProfileImage(uid), getRatingSummary(uid), getVerifiedSet()])
        .then(([avatar, rating, verifiedSet]) => ({
          avatar,
          rating,
          verified: verifiedSet.has(uid),
        }))
        .catch(() => ({ avatar: null, rating: { average: 0, count: 0 }, verified: false }))
    );
  }
  return driverInfoCache.get(uid);
};

const RideCard = ({ ride, isBooked, onChanged }) => {
  const t = useT();
  const lang = useLang();
  const history = useHistory();
  const uid = useSelector((state) => state.auth.uid);
  const myName = useSelector((state) => state.profile.data?.name);

  const [driver, setDriver] = useState({ avatar: null, rating: null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let mounted = true;
    getDriverInfo(ride.localId).then((info) => {
      if (mounted) setDriver(info);
    });
    return () => {
      mounted = false;
    };
  }, [ride.localId]);

  const left = seatsLeft(ride);
  const isMine = uid && ride.localId === uid;

  const handleBook = async () => {
    if (!uid) {
      history.push("/signin");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await bookRide(ride, { uid, name: myName });
      setMessage({ type: "ok", text: t("bookingConfirmed") });
      onChanged?.();
    } catch (error) {
      const text =
        error.message === "full"
          ? t("fullyBooked")
          : error.message === "already-booked"
          ? t("alreadyBooked")
          : error.message === "own-ride"
          ? t("ownRide")
          : t("errGeneric");
      setMessage({ type: "err", text });
    } finally {
      setBusy(false);
    }
  };

  const handleCancelBooking = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await cancelBooking(ride, uid);
      onChanged?.();
    } catch {
      setMessage({ type: "err", text: t("errGeneric") });
    } finally {
      setBusy(false);
    }
  };

  const handleCancelRide = async () => {
    setBusy(true);
    try {
      await cancelRide(ride.id);
      onChanged?.();
    } catch {
      setMessage({ type: "err", text: t("errGeneric") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`card fadeUp ${classes.card}`}>
      <div className={classes.top}>
        <div className={classes.route}>
          <div className={classes.stop}>
            <span className={classes.time}>{ride.departureTime}</span>
            <span className={classes.dot} />
            <span className={classes.city}>{cityLabel(ride.departure, lang)}</span>
          </div>
          <div className={classes.lineWrap}>
            <span className={classes.line} />
          </div>
          <div className={classes.stop}>
            <span className={classes.time}>{ride.arrivalTime}</span>
            <span className={`${classes.dot} ${classes.dotEnd}`} />
            <span className={classes.city}>{cityLabel(ride.destination, lang)}</span>
          </div>
        </div>
        <div className={classes.priceBox}>
          {Number(ride.price) === 0 ? (
            <span className={`${classes.price} ${classes.freePrice}`}>{t("free")}</span>
          ) : (
            <>
              <span className={classes.price}>{ride.price} ₾</span>
              <span className={classes.perSeat}>{t("perSeat")}</span>
            </>
          )}
        </div>
      </div>

      {(ride.badges?.length > 0 || ride.comment) && (
        <div className={classes.extras}>
          {ride.badges?.length > 0 && (
            <div className={classes.prefRow}>
              {ride.badges.map((key) => {
                const badge = RIDE_BADGES.find((b) => b.key === key);
                return badge ? (
                  <span key={key} className={classes.prefBadge}>
                    <span aria-hidden="true">{badge.icon}</span> {t(badge.tKey)}
                  </span>
                ) : null;
              })}
            </div>
          )}
          {ride.comment && <p className={classes.comment}>“{ride.comment}”</p>}
        </div>
      )}

      <div className={classes.bottom}>
        <Link to={`/profile/${ride.localId}`} className={classes.driver}>
          <Avatar src={driver.avatar} name={ride.name} size={40} />
          <span className={classes.driverInfo}>
            <span className={classes.driverName}>
              <span className={classes.driverNameText}>{ride.name}</span>
              {driver.verified && <VerifiedBadge size={15} />}
            </span>
            {driver.rating && driver.rating.count > 0 && (
              <span className={classes.driverRating}>
                <StarRating value={driver.rating.average} size={13} />
                <span>
                  {driver.rating.average} ({driver.rating.count})
                </span>
              </span>
            )}
          </span>
        </Link>

        <div className={classes.actions}>
          {ride.rideType === "bus" && (
            <span className="badge badgeGrey">🚌 {t("busBadge")}</span>
          )}
          <span
            className={`badge ${
              left > 0 ? (left <= 1 ? "badgeRed" : "badgeBlue") : "badgeGrey"
            }`}
          >
            {left > 0 ? `${left} ${left === 1 ? t("seat") : t("seats")} ${t("seatsLeft")}` : t("soldOut")}
          </span>

          {isMine && (
            <>
              <span className="badge badgeGreen">{t("yourRide")}</span>
              <button
                type="button"
                className="btn btnDanger btnSm"
                onClick={handleCancelRide}
                disabled={busy}
              >
                {t("cancelRide")}
              </button>
            </>
          )}

          {!isMine && isBooked && (
            <button
              type="button"
              className="btn btnGhost btnSm"
              onClick={handleCancelBooking}
              disabled={busy}
            >
              {t("cancelBooking")}
            </button>
          )}

          {!isMine && !isBooked && left > 0 && (
            <button
              type="button"
              className="btn btnPrimary btnSm"
              onClick={handleBook}
              disabled={busy}
            >
              {uid ? t("book") : t("bookSignIn")}
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className={message.type === "ok" ? classes.msgOk : classes.msgErr}>
          {message.text}
        </p>
      )}
    </article>
  );
};

export default RideCard;
