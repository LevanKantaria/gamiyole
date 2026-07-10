import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import classes from "./AdminPage.module.css";
import { useT, useLang, cityLabel, formatDate } from "../../i18n";
import {
  getAdminOverview,
  suspendDriver,
  restoreDriver,
} from "../../services/admin";
import { verifyUser, unverifyUser } from "../../services/verification";
import VerifiedBadge from "../UI/VerifiedBadge";
import { cancelRide, deleteRide } from "../../services/rides";
import { deleteRating, deleteLegacyComment, getLegacyComments } from "../../services/ratings";
import Avatar from "../UI/Avatar";
import StarRating from "../UI/StarRating";

const UserReviews = ({ user, onChanged }) => {
  const t = useT();
  const [legacy, setLegacy] = useState([]);

  useEffect(() => {
    getLegacyComments(user.uid).then(setLegacy).catch(() => setLegacy([]));
  }, [user.uid]);

  const removeReview = async (review) => {
    if (!window.confirm(t("adminDeleteReviewConfirm"))) return;
    if (review.legacy) {
      await deleteLegacyComment(user.uid, review.key);
      setLegacy((prev) => prev.filter((r) => r.key !== review.key));
    } else {
      await deleteRating(user.uid, review.key);
      onChanged();
    }
  };

  const reviews = [...user.ratingSummary.reviews, ...legacy];
  if (!reviews.length) {
    return <p className={classes.noReviews}>{t("noReviews")}</p>;
  }

  return (
    <ul className={classes.reviewList}>
      {reviews.map((r) => (
        <li key={`${r.legacy ? "legacy" : "new"}-${r.key}`} className={classes.reviewItem}>
          <div className={classes.reviewBody}>
            <div className={classes.reviewTop}>
              <strong>{r.ratedByName || "User"}</strong>
              {typeof r.rating === "number" && r.rating > 0 && (
                <StarRating value={r.rating} size={13} />
              )}
              {r.createdAt && (
                <span className={classes.reviewDate}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {r.comment && <p className={classes.reviewComment}>{r.comment}</p>}
          </div>
          <button
            type="button"
            className="btn btnDanger btnSm"
            onClick={() => removeReview(r)}
          >
            {t("adminDeleteReview")}
          </button>
        </li>
      ))}
    </ul>
  );
};

const AdminPage = () => {
  const t = useT();
  const lang = useLang();
  const { uid, isAdmin, initialized } = useSelector((state) => state.auth);

  const [data, setData] = useState(null);
  const [tab, setTab] = useState("users");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedUid, setExpandedUid] = useState(null);
  const [busyUid, setBusyUid] = useState(null);

  const reload = useCallback(() => {
    getAdminOverview().then(setData).catch(() => setData({ users: [], activeRides: [] }));
  }, []);

  useEffect(() => {
    if (isAdmin) reload();
  }, [isAdmin, reload]);

  const users = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.users
      .filter((u) => {
        if (filter === "drivers" && u.userType !== "driver") return false;
        if (filter === "suspended" && !u.suspended) return false;
        if (!q) return true;
        return [u.name, u.email, u.number].some((v) => v?.toLowerCase().includes(q));
      })
      .sort((a, b) => (b.rideCount - a.rideCount) || a.name.localeCompare(b.name));
  }, [data, search, filter]);

  if (!initialized) return <div className="spinner" />;

  if (!uid || !isAdmin) {
    return (
      <div className={`container ${classes.gate}`}>
        <div className="alert alertError">{t("adminNotAllowed")}</div>
        <Link to="/" className="btn btnGhost">
          {t("backHome")}
        </Link>
      </div>
    );
  }

  if (!data) return <div className="spinner" />;

  const driverCount = data.users.filter((u) => u.userType === "driver").length;
  const suspendedCount = data.users.filter((u) => u.suspended).length;

  const toggleSuspend = async (user) => {
    if (!user.suspended && !window.confirm(t("adminSuspendConfirm"))) return;
    setBusyUid(user.uid);
    try {
      if (user.suspended) await restoreDriver(user.uid);
      else await suspendDriver(user.uid, uid);
      reload();
    } finally {
      setBusyUid(null);
    }
  };

  const toggleVerify = async (user) => {
    setBusyUid(user.uid);
    try {
      if (user.verified) await unverifyUser(user.uid);
      else await verifyUser(user.uid);
      reload();
    } finally {
      setBusyUid(null);
    }
  };

  const handleCancelRide = async (ride) => {
    await cancelRide(ride.id);
    reload();
  };

  const handleDeleteRide = async (ride) => {
    if (!window.confirm(t("adminDeleteRideConfirm"))) return;
    await deleteRide(ride.id);
    reload();
  };

  return (
    <div className={`container ${classes.page}`}>
      <h1 className={classes.title}>{t("adminTitle")}</h1>
      <p className={classes.subtitle}>{t("adminSubtitle")}</p>

      <div className={classes.stats}>
        <div className={`card ${classes.stat}`}>
          <span className={classes.statValue}>{driverCount}</span>
          <span className={classes.statLabel}>{t("adminDrivers")}</span>
        </div>
        <div className={`card ${classes.stat}`}>
          <span className={classes.statValue}>{data.activeRides.length}</span>
          <span className={classes.statLabel}>{t("adminRides")}</span>
        </div>
        <div className={`card ${classes.stat}`}>
          <span className={`${classes.statValue} ${suspendedCount ? classes.statDanger : ""}`}>
            {suspendedCount}
          </span>
          <span className={classes.statLabel}>{t("adminDisabled")}</span>
        </div>
      </div>

      <div className={classes.tabs}>
        <button
          type="button"
          className={`${classes.tab} ${tab === "users" ? classes.tabActive : ""}`}
          onClick={() => setTab("users")}
        >
          {t("adminUser")}
        </button>
        <button
          type="button"
          className={`${classes.tab} ${tab === "rides" ? classes.tabActive : ""}`}
          onClick={() => setTab("rides")}
        >
          {t("adminRidesTitle")}
        </button>
      </div>

      {tab === "users" && (
        <>
          <div className={classes.controls}>
            <input
              className={`input ${classes.search}`}
              type="search"
              placeholder={t("adminSearch")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={`select ${classes.filter}`}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">{t("adminAll")}</option>
              <option value="drivers">{t("adminOnlyDrivers")}</option>
              <option value="suspended">{t("adminOnlySuspended")}</option>
            </select>
          </div>

          <div className={`card ${classes.tableCard}`}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th>{t("adminUser")}</th>
                  <th>{t("adminContact")}</th>
                  <th>{t("adminRating")}</th>
                  <th>{t("adminRidesCol")}</th>
                  <th>{t("adminStatus")}</th>
                  <th>{t("adminActions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className={classes.emptyCell}>
                      {t("adminNoUsers")}
                    </td>
                  </tr>
                )}
                {users.map((user) => (
                  <Fragment key={user.uid}>
                    <tr>
                      <td>
                        <div className={classes.userCell}>
                          <Avatar src={user.avatar} name={user.name} size={36} />
                          <div className={classes.userMeta}>
                            <strong className={classes.userNameCell}>
                              {user.name || "—"}
                              {user.verified && <VerifiedBadge size={15} />}
                            </strong>
                            <span
                              className={`badge ${
                                user.userType === "driver" ? "badgeBlue" : "badgeGrey"
                              } ${classes.roleBadge}`}
                            >
                              {user.userType === "driver" ? t("driver") : t("passenger")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={classes.contactCell}>
                          <span>{user.email || "—"}</span>
                          <span className="muted">{user.number || ""}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={classes.ratingButton}
                          onClick={() =>
                            setExpandedUid(expandedUid === user.uid ? null : user.uid)
                          }
                          title={t("reviews")}
                        >
                          <StarRating value={user.ratingSummary.average} size={13} />
                          <span>
                            {user.ratingSummary.count > 0
                              ? `${user.ratingSummary.average} (${user.ratingSummary.count})`
                              : "—"}
                          </span>
                        </button>
                      </td>
                      <td>{user.rideCount}</td>
                      <td>
                        <span
                          className={`badge ${user.suspended ? "badgeRed" : "badgeGreen"}`}
                        >
                          {user.suspended ? t("adminSuspendedBadge") : t("adminActive")}
                        </span>
                      </td>
                      <td>
                        <div className={classes.actionsCell}>
                          <Link to={`/profile/${user.uid}`} className="btn btnGhost btnSm">
                            {t("adminView")}
                          </Link>
                          <button
                            type="button"
                            className={`btn btnSm ${user.verified ? "btnGhost" : "btnSuccess"}`}
                            onClick={() => toggleVerify(user)}
                            disabled={busyUid === user.uid}
                          >
                            {user.verified ? t("adminUnverify") : t("adminVerify")}
                          </button>
                          <button
                            type="button"
                            className={`btn btnSm ${
                              user.suspended ? "btnSuccess" : "btnDanger"
                            }`}
                            onClick={() => toggleSuspend(user)}
                            disabled={busyUid === user.uid}
                          >
                            {user.suspended ? t("adminRestore") : t("adminSuspend")}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedUid === user.uid && (
                      <tr className={classes.expandedRow}>
                        <td colSpan={6}>
                          <div className={classes.expandedInner}>
                            <span className="label">
                              {user.ratingSummary.count} {t("adminReviewsFor")} — {user.name}
                            </span>
                            <UserReviews user={user} onChanged={reload} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "rides" && (
        <div className={`card ${classes.tableCard}`}>
          <table className={classes.table}>
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>
                  {t("from")} → {t("to")}
                </th>
                <th>{t("adminUser")}</th>
                <th>{t("price")}</th>
                <th>{t("seats")}</th>
                <th>{t("adminActions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.activeRides.length === 0 && (
                <tr>
                  <td colSpan={6} className={classes.emptyCell}>
                    {t("adminNoRides")}
                  </td>
                </tr>
              )}
              {data.activeRides.map((ride) => (
                <tr key={ride.id}>
                  <td>
                    <div className={classes.contactCell}>
                      <span>{formatDate(ride.date, lang)}</span>
                      <span className="muted">
                        {ride.departureTime}
                        {ride.arrivalTime ? `–${ride.arrivalTime}` : ""}
                      </span>
                    </div>
                  </td>
                  <td>
                    <strong>
                      {cityLabel(ride.departure, lang)} → {cityLabel(ride.destination, lang)}
                    </strong>
                  </td>
                  <td>
                    <Link to={`/profile/${ride.localId}`}>{ride.name}</Link>
                  </td>
                  <td>{ride.price} ₾</td>
                  <td>
                    {typeof ride.seatsAvailable === "number"
                      ? `${ride.seatsAvailable}/${ride.seats}`
                      : ride.seats}
                  </td>
                  <td>
                    <div className={classes.actionsCell}>
                      <button
                        type="button"
                        className="btn btnGhost btnSm"
                        onClick={() => handleCancelRide(ride)}
                      >
                        {t("adminCancelRide")}
                      </button>
                      <button
                        type="button"
                        className="btn btnDanger btnSm"
                        onClick={() => handleDeleteRide(ride)}
                      >
                        {t("adminDeleteRide")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
