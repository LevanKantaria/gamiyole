import { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import classes from "./PublishPage.module.css";
import { useT, useLang, DAYS_SHORT, RIDE_BADGES, cityLabel } from "../../i18n";
import Seo from "../UI/Seo";
import { publishRide, todayISO } from "../../services/rides";
import { isProfileComplete } from "../../services/profile";
import {
  getRoutines,
  createRoutine,
  deleteRoutine,
  pauseRoutine,
  resumeRoutine,
  materializeRoutines,
  addMonthsISO,
} from "../../services/routines";
import { subscribeRequests } from "../../services/requests";
import TimeSelect from "../UI/TimeSelect";
import DatePicker from "../UI/DatePicker";
import CityCombobox from "../UI/CityCombobox";
import RequestCard from "../Requests/RequestCard";

const initialForm = {
  departure: "",
  destination: "",
  date: todayISO(),
  departureTime: "",
  price: "",
  seats: "3",
  rideType: "carpool",
  badges: [],
  comment: "",
};

const CARPOOL_SEATS = [1, 2, 3, 4, 5, 6, 7, 8];
const BUS_SEATS = [...CARPOOL_SEATS, 10, 15, 20, 25, 30, 40, 50];

// Monday-first display order; values are Date#getDay() indices.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

const PublishPage = () => {
  const t = useT();
  const lang = useLang();
  const history = useHistory();
  const { uid, initialized, isSuspended } = useSelector((state) => state.auth);
  const profile = useSelector((state) => state.profile.data);
  const profileLoaded = useSelector((state) => state.profile.loaded);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState("once");
  const [days, setDays] = useState([]);
  const [duration, setDuration] = useState(1);
  const [routines, setRoutines] = useState([]);
  const [routineSaved, setRoutineSaved] = useState(false);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!uid) return;
    getRoutines(uid).then(setRoutines).catch(() => setRoutines([]));
  }, [uid]);

  // Show passengers looking for rides so the driver can publish to meet demand.
  useEffect(() => {
    if (!uid) return undefined;
    return subscribeRequests((all) => setRequests(all.filter((r) => r.passengerUid !== uid)));
  }, [uid]);

  if (!initialized || (uid && !profileLoaded)) {
    return <div className="spinner" />;
  }

  if (!uid) {
    return (
      <div className={`container ${classes.gate}`}>
        <Seo title={t("seoPublishTitle")} description={t("seoPublishDesc")} />
        <div className={`card ${classes.gateCard}`}>
          <h2>{t("signInToPublish")}</h2>
          <Link to="/signin" className="btn btnPrimary">
            {t("signIn")}
          </Link>
        </div>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className={`container ${classes.gate}`}>
        <div className="alert alertError">{t("accountDisabledBanner")}</div>
      </div>
    );
  }

  if (!isProfileComplete(profile)) {
    return (
      <div className={`container ${classes.gate}`}>
        <div className={`card ${classes.gateCard}`}>
          <h2>{t("completeProfileFirst")}</h2>
          <Link to="/complete-profile" className="btn btnPrimary">
            {t("completeProfileTitle")}
          </Link>
        </div>
      </div>
    );
  }

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.departure || !form.destination) errs.cities = t("errCities");
    else if (form.departure === form.destination) errs.cities = t("errSameCity");
    if (mode === "once" && (!form.date || form.date < todayISO())) errs.date = t("errDate");
    if (mode === "routine" && days.length === 0) errs.days = t("errDays");
    if (!form.departureTime) errs.time = t("errTime");
    const price = Number(form.price);
    if (form.price === "" || price < 0 || price > 500) errs.price = t("errPrice");
    const seats = Number(form.seats);
    const maxSeats = form.rideType === "bus" ? 60 : 8;
    if (!seats || seats < 1 || seats > maxSeats) errs.seats = t("errSeats");
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setFailed(false);
    setRoutineSaved(false);
    try {
      if (mode === "routine") {
        const routineId = await createRoutine(uid, {
          departure: form.departure,
          destination: form.destination,
          departureTime: form.departureTime,
          price: form.price,
          seats: form.seats,
          days,
          endDate: addMonthsISO(duration),
          ...(form.rideType === "bus" ? { rideType: "bus" } : {}),
          ...(form.badges.length ? { badges: form.badges } : {}),
          ...(form.comment.trim() ? { comment: form.comment.trim() } : {}),
        });
        await materializeRoutines(uid, { name: profile.name, number: profile.number }, routineId);
        setRoutines(await getRoutines(uid));
        setDays([]);
        setRoutineSaved(true);
        setSubmitting(false);
        return;
      }
      await publishRide(uid, { name: profile.name, number: profile.number }, form);
      const params = new URLSearchParams({
        from: form.departure,
        to: form.destination,
        when: "date",
        date: form.date,
      });
      history.push(`/find?${params.toString()}`);
    } catch {
      setFailed(true);
      setSubmitting(false);
    }
  };

  const toggleBadge = (key) => {
    setForm((prev) => ({
      ...prev,
      badges: prev.badges.includes(key)
        ? prev.badges.filter((b) => b !== key)
        : [...prev.badges, key],
    }));
  };

  const toggleDay = (day) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
    setErrors((prev) => ({ ...prev, days: undefined }));
  };

  const toggleRoutine = async (routine) => {
    if (routine.active) {
      await pauseRoutine(uid, routine.id);
    } else {
      await resumeRoutine(uid, routine.id, { name: profile.name, number: profile.number });
    }
    setRoutines(await getRoutines(uid));
  };

  const removeRoutine = async (routine) => {
    if (!window.confirm(t("deleteRoutineConfirm"))) return;
    await deleteRoutine(uid, routine.id);
    setRoutines(await getRoutines(uid));
  };

  const setCity = (field) => (cityValue) => {
    setForm((prev) => ({ ...prev, [field]: cityValue }));
    setErrors((prev) => ({ ...prev, cities: undefined }));
  };

  return (
    <div className={`container ${classes.page}`}>
      <Seo title={t("seoPublishTitle")} description={t("seoPublishDesc")} />
      <div className={`card ${classes.formCard}`}>
        <h1 className={classes.title}>{t("publishTitle")}</h1>

        <div className={classes.modeTabs}>
          {["once", "routine"].map((m) => (
            <button
              key={m}
              type="button"
              className={`${classes.modeTab} ${mode === m ? classes.modeTabActive : ""}`}
              onClick={() => {
                setMode(m);
                setErrors({});
                setRoutineSaved(false);
              }}
            >
              {m === "once" ? t("modeOnce") : t("modeRoutine")}
            </button>
          ))}
        </div>

        <p className={classes.hint}>{mode === "routine" ? t("routineHint") : t("publishHint")}</p>

        {failed && <div className="alert alertError">{t("errGeneric")}</div>}
        {routineSaved && <div className="alert alertSuccess">{t("routineSaved")}</div>}

        <form onSubmit={submit} noValidate>
          <div className={classes.row}>
            <div className={classes.field}>
              <label className="label" htmlFor="pub-from">
                {t("from")}
              </label>
              <CityCombobox
                id="pub-from"
                className={errors.cities ? "inputError" : ""}
                value={form.departure}
                onChange={setCity("departure")}
                placeholder={t("selectCity")}
                exclude={form.destination}
              />
            </div>
            <div className={classes.field}>
              <label className="label" htmlFor="pub-to">
                {t("to")}
              </label>
              <CityCombobox
                id="pub-to"
                className={errors.cities ? "inputError" : ""}
                value={form.destination}
                onChange={setCity("destination")}
                placeholder={t("selectCity")}
                exclude={form.departure}
              />
            </div>
          </div>
          {errors.cities && <p className="fieldError">{errors.cities}</p>}

          {mode === "routine" && (
            <div className={classes.block}>
              <span className="label">{t("repeatOn")}</span>
              <div className={classes.dayRow}>
                {WEEK.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`${classes.dayChip} ${
                      days.includes(day) ? classes.dayChipOn : ""
                    } ${errors.days ? classes.dayChipError : ""}`}
                    onClick={() => toggleDay(day)}
                    aria-pressed={days.includes(day)}
                  >
                    {DAYS_SHORT[lang][day]}
                  </button>
                ))}
              </div>
              {errors.days && <p className="fieldError">{errors.days}</p>}

              <span className={`label ${classes.durationLabel}`}>{t("durationLabel")}</span>
              <div className={classes.dayRow}>
                {[1, 2, 3].map((months) => (
                  <button
                    key={months}
                    type="button"
                    className={`${classes.dayChip} ${duration === months ? classes.dayChipOn : ""}`}
                    onClick={() => setDuration(months)}
                    aria-pressed={duration === months}
                  >
                    {t(`months${months}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={classes.row}>
            {mode === "once" && (
              <div className={classes.field}>
                <label className="label" htmlFor="pub-date">
                  {t("date")}
                </label>
                <DatePicker
                  id="pub-date"
                  className={errors.date ? "inputError" : ""}
                  value={form.date}
                  onChange={(date) => {
                    setForm((prev) => ({ ...prev, date }));
                    setErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                />
              </div>
            )}
            <div className={classes.field}>
              <label className="label" htmlFor="pub-dep-time">
                {t("departureTime")}
              </label>
              <TimeSelect
                id="pub-dep-time"
                className={`select ${errors.time ? "inputError" : ""}`}
                value={form.departureTime}
                onChange={set("departureTime")}
              />
            </div>
          </div>
          {errors.date && <p className="fieldError">{errors.date}</p>}
          {errors.time && <p className="fieldError">{errors.time}</p>}

          <div className={classes.block}>
            <span className="label">{t("rideTypeLabel")}</span>
            <div className={classes.dayRow}>
              {["carpool", "bus"].map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`${classes.prefChip} ${
                    form.rideType === type ? classes.prefChipOn : ""
                  }`}
                  onClick={() => setForm((prev) => ({ ...prev, rideType: type }))}
                  aria-pressed={form.rideType === type}
                >
                  {type === "carpool" ? "🚗" : "🚌"}{" "}
                  {type === "carpool" ? t("typeCarpool") : t("typeBus")}
                </button>
              ))}
            </div>
          </div>

          <div className={classes.row}>
            <div className={classes.field}>
              <label className="label" htmlFor="pub-price">
                {t("price")}
              </label>
              <input
                id="pub-price"
                type="number"
                min="0"
                max="500"
                className={`input ${errors.price ? "inputError" : ""}`}
                value={form.price}
                onChange={set("price")}
                placeholder="30"
              />
            </div>
            <div className={classes.field}>
              <label className="label" htmlFor="pub-seats">
                {t("seatsOffered")}
              </label>
              <select
                id="pub-seats"
                className={`select ${errors.seats ? "inputError" : ""}`}
                value={form.seats}
                onChange={set("seats")}
              >
                {(form.rideType === "bus" ? BUS_SEATS : CARPOOL_SEATS).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {errors.price && <p className="fieldError">{errors.price}</p>}
          {errors.seats && <p className="fieldError">{errors.seats}</p>}

          <div className={classes.block}>
            <span className="label">{t("prefsLabel")}</span>
            <div className={classes.dayRow}>
              {RIDE_BADGES.map((badge) => (
                <button
                  key={badge.key}
                  type="button"
                  className={`${classes.prefChip} ${
                    form.badges.includes(badge.key) ? classes.prefChipOn : ""
                  }`}
                  onClick={() => toggleBadge(badge.key)}
                  aria-pressed={form.badges.includes(badge.key)}
                >
                  <span aria-hidden="true">{badge.icon}</span> {t(badge.tKey)}
                </button>
              ))}
            </div>
          </div>

          <div className={classes.block}>
            <label className="label" htmlFor="pub-comment">
              {t("commentLabel")}
            </label>
            <textarea
              id="pub-comment"
              className="textarea"
              rows={2}
              maxLength={200}
              placeholder={t("commentPlaceholder")}
              value={form.comment}
              onChange={set("comment")}
            />
          </div>

          <button
            type="submit"
            className={`btn btnPrimary ${classes.submit}`}
            disabled={submitting}
          >
            {submitting
              ? t("publishing")
              : mode === "routine"
              ? t("saveRoutine")
              : t("publish")}
          </button>
        </form>

        {routines.length > 0 && (
          <section className={classes.routines}>
            <h3 className={classes.routinesTitle}>{t("myRoutines")}</h3>
            <ul className={classes.routineList}>
              {routines.map((routine) => (
                <li key={routine.id} className={classes.routineItem}>
                  <div className={classes.routineInfo}>
                    <strong>
                      {cityLabel(routine.departure, lang)} → {cityLabel(routine.destination, lang)}
                    </strong>
                    <span className={classes.routineMeta}>
                      {WEEK.filter((d) => (routine.days || []).includes(d))
                        .map((d) => DAYS_SHORT[lang][d])
                        .join(", ")}{" "}
                      · {routine.departureTime} · {routine.price} ₾
                      {routine.endDate &&
                        (lang === "GE"
                          ? ` · ${routine.endDate}-მდე`
                          : ` · ${t("untilDate")} ${routine.endDate}`)}
                    </span>
                  </div>
                  <div className={classes.routineActions}>
                    <span className={`badge ${routine.active ? "badgeGreen" : "badgeGrey"}`}>
                      {routine.active ? t("adminActive") : t("paused")}
                    </span>
                    <button
                      type="button"
                      className="btn btnGhost btnSm"
                      onClick={() => toggleRoutine(routine)}
                    >
                      {routine.active ? t("pause") : t("resume")}
                    </button>
                    <button
                      type="button"
                      className="btn btnDanger btnSm"
                      onClick={() => removeRoutine(routine)}
                    >
                      {t("deleteBtn")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {requests.length > 0 && (
        <section className={classes.demand}>
          <div className={classes.demandHead}>
            <h3>{t("passengersLooking")}</h3>
            <Link to="/requests">{t("viewAllRequests")} →</Link>
          </div>
          <div className={classes.demandList}>
            {requests.slice(0, 4).map((request) => (
              <RequestCard key={request.id} request={request} currentUid={uid} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default PublishPage;
