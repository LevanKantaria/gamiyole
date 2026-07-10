import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import classes from "./RideList.module.css";
import { useT, useLang, formatDate } from "../../i18n";
import { subscribeUserBookings } from "../../services/bookings";
import { isExternalRide } from "../../services/external";
import RideCard from "./RideCard";
import ExternalRideCard from "./ExternalRideCard";

// Renders rides grouped by date. Subscribes to the signed-in user's bookings
// so cards can show book/cancel states live.
const RideList = ({ rides, emptyState }) => {
  const t = useT();
  const lang = useLang();
  const uid = useSelector((state) => state.auth.uid);
  const [bookedIds, setBookedIds] = useState([]);

  useEffect(() => {
    if (!uid) {
      setBookedIds([]);
      return undefined;
    }
    return subscribeUserBookings(uid, setBookedIds);
  }, [uid]);

  if (!rides.length) {
    return (
      emptyState ?? (
        <div className={`${classes.empty} fadeUp`}>
          <div className={classes.emptyIcon}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M15.5 15.5 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M8 10.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1.5 2.5" />
            </svg>
          </div>
          <p className={classes.emptyTitle}>{t("noRides")}</p>
          <p className={classes.emptyHint}>{t("noRidesHint")}</p>
        </div>
      )
    );
  }

  const byDate = rides.reduce((groups, ride) => {
    (groups[ride.date] = groups[ride.date] || []).push(ride);
    return groups;
  }, {});

  return (
    <div className={classes.list}>
      {Object.entries(byDate).map(([date, dateRides]) => (
        <section key={date}>
          <h3 className={classes.dateHeading}>{formatDate(date, lang)}</h3>
          <div className={classes.cards}>
            {dateRides.map((ride) =>
              isExternalRide(ride) ? (
                <ExternalRideCard key={ride.id} ride={ride} />
              ) : (
                <RideCard key={ride.id} ride={ride} isBooked={bookedIds.includes(ride.id)} />
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
};

export default RideList;
