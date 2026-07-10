import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import classes from "./Reviews.module.css";
import { useT, useLang } from "../../i18n";
import {
  subscribeRatingSummary,
  submitRating,
  getMyRatingFor,
  getLegacyComments,
} from "../../services/ratings";
import StarRating from "../UI/StarRating";
import Avatar from "../UI/Avatar";

// Reviews work the same for drivers and passengers: anyone signed in can rate
// any other member once; editing your review overwrites the previous one.
const Reviews = ({ targetUid, targetName }) => {
  const t = useT();
  const lang = useLang();
  const uid = useSelector((state) => state.auth.uid);
  const myName = useSelector((state) => state.profile.data?.name);

  const [summary, setSummary] = useState(null);
  const [legacy, setLegacy] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => subscribeRatingSummary(targetUid, setSummary), [targetUid]);

  useEffect(() => {
    getLegacyComments(targetUid).then(setLegacy).catch(() => setLegacy([]));
  }, [targetUid]);

  const loadMine = useCallback(() => {
    if (!uid || uid === targetUid) return;
    getMyRatingFor(targetUid, uid).then((mine) => {
      if (mine) {
        setRating(mine.rating || 0);
        setComment(mine.comment || "");
      }
    });
  }, [uid, targetUid]);

  useEffect(loadMine, [loadMine]);

  const send = async (e) => {
    e.preventDefault();
    if (!rating) {
      setNotice({ type: "err", text: t("reviewNeedsRating") });
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      await submitRating(targetUid, { uid, name: myName }, { rating, comment });
      setNotice({ type: "ok", text: t("reviewSent") });
    } catch {
      setNotice({ type: "err", text: t("errGeneric") });
    } finally {
      setSending(false);
    }
  };

  const reviews = [...(summary?.reviews || []), ...legacy];
  const canReview = uid && uid !== targetUid;

  return (
    <section className={classes.section}>
      <div className={classes.head}>
        <h3>{t("reviews")}</h3>
        {summary && summary.count > 0 && (
          <span className={classes.average}>
            <StarRating value={summary.average} size={16} />
            <strong>{summary.average}</strong>
            <span className="muted">({summary.count})</span>
          </span>
        )}
      </div>

      {canReview && (
        <form className={`card ${classes.form}`} onSubmit={send}>
          <p className={classes.formTitle}>
            {t("leaveReview")} {targetName}?
          </p>
          <div className={classes.formRating}>
            <span className="label">{t("yourRating")}</span>
            <StarRating value={rating} onChange={setRating} size={26} />
          </div>
          <textarea
            className="textarea"
            placeholder={t("reviewPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
          {notice && (
            <p className={notice.type === "ok" ? classes.ok : classes.err}>{notice.text}</p>
          )}
          <button type="submit" className="btn btnPrimary btnSm" disabled={sending}>
            {t("sendReview")}
          </button>
        </form>
      )}

      {!uid && (
        <p className={classes.signInHint}>
          <Link to="/signin">{t("signInToReview")}</Link>
        </p>
      )}

      {summary === null ? (
        <div className="spinner" />
      ) : reviews.length === 0 ? (
        <p className={classes.emptyText}>{t("noReviews")}</p>
      ) : (
        <ul className={classes.list}>
          {reviews.map((r) => (
            <li key={`${r.legacy ? "legacy" : "new"}-${r.key}`} className={`card ${classes.review}`}>
              <div className={classes.reviewHead}>
                <Avatar name={r.ratedByName} size={32} />
                <div className={classes.reviewMeta}>
                  {r.ratedBy ? (
                    <Link to={`/profile/${r.ratedBy}`} className={classes.reviewer}>
                      {r.ratedByName || "User"}
                    </Link>
                  ) : (
                    <span className={classes.reviewer}>{r.ratedByName || "User"}</span>
                  )}
                  {r.createdAt && (
                    <span className={classes.reviewDate}>
                      {new Date(r.createdAt).toLocaleDateString(
                        lang === "GE" ? "ka-GE" : "en-GB",
                        { year: "numeric", month: "short", day: "numeric" }
                      )}
                    </span>
                  )}
                </div>
                {typeof r.rating === "number" && r.rating > 0 && (
                  <StarRating value={r.rating} size={14} />
                )}
              </div>
              {r.comment && <p className={classes.comment}>{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default Reviews;
