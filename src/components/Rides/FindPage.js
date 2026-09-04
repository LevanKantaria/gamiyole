import { useEffect, useMemo, useState } from "react";
import { useLocation, useHistory, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import classes from "./FindPage.module.css";
import { useT, useLang, cityLabel } from "../../i18n";
import Seo from "../UI/Seo";
import {
  subscribeUpcomingRides,
  getRidesForDate,
  filterRides,
  todayISO,
} from "../../services/rides";
import {
  subscribeExternalRides,
  getExternalRidesForDate,
} from "../../services/external";
import SearchBar from "./SearchBar";
import RideList from "./RideList";
import RideSkeleton from "./RideSkeleton";
import RequestForm from "../Requests/RequestForm";

// Search state lives in the URL (?from=&to=&when=) so results are shareable.
const FindPage = () => {
  const t = useT();
  const lang = useLang();
  const history = useHistory();
  const location = useLocation();
  const { uid } = useSelector((state) => state.auth);
  const myName = useSelector((state) => state.profile.data?.name);
  const [rides, setRides] = useState(null);
  const [external, setExternal] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestPosted, setRequestPosted] = useState(false);
  const [searching, setSearching] = useState(true);
  const [searchNonce, setSearchNonce] = useState(0);

  // Brief skeleton pulse on every search so the user sees the search ran,
  // even though filtering itself is instant.
  useEffect(() => {
    setSearching(true);
    const timer = setTimeout(() => setSearching(false), 650);
    return () => clearTimeout(timer);
  }, [location.search, searchNonce]);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const applied = {
    departure: params.get("from") || "",
    destination: params.get("to") || "",
    when: params.get("when") || "any",
    date: params.get("date") || "",
    type: params.get("type") || "",
    priceMode: params.get("price") || "",
  };

  const setFilter = (key, value) => {
    const next = new URLSearchParams(location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    history.replace(`/find?${next.toString()}`);
  };

  const [search, setSearch] = useState({
    departure: applied.departure,
    destination: applied.destination,
    when: applied.when,
    date: applied.date || todayISO(),
  });

  useEffect(() => subscribeUpcomingRides(setRides), []);
  useEffect(() => subscribeExternalRides(setExternal), []);

  // The live feed only spans the next two weeks; an exact-date search fetches
  // that one date directly so far-out scheduled rides are still findable.
  const [dateRides, setDateRides] = useState(null);
  const [dateExternal, setDateExternal] = useState([]);
  const exactDate = applied.when === "date" && applied.date;
  useEffect(() => {
    if (!exactDate) {
      setDateRides(null);
      setDateExternal([]);
      return undefined;
    }
    let live = true;
    setDateRides(null);
    setDateExternal([]);
    getRidesForDate(applied.date)
      .then((r) => live && setDateRides(r))
      .catch(() => live && setDateRides([]));
    getExternalRidesForDate(applied.date)
      .then((r) => live && setDateExternal(r))
      .catch(() => live && setDateExternal([]));
    return () => {
      live = false;
    };
  }, [exactDate, applied.date]);

  const submit = () => {
    const next = new URLSearchParams();
    if (search.departure) next.set("from", search.departure);
    if (search.destination) next.set("to", search.destination);
    if (search.when !== "any") next.set("when", search.when);
    if (search.when === "date" && search.date) next.set("date", search.date);
    history.replace(`/find?${next.toString()}`);
    setSearchNonce((n) => n + 1);
  };

  const baseReal = exactDate ? dateRides : rides;
  const baseExternal = exactDate ? dateExternal : external;
  const source =
    baseReal === null
      ? null
      : [...baseReal, ...baseExternal].sort(
          (a, b) =>
            (a.date || "").localeCompare(b.date || "") ||
            (a.departureTime || "").localeCompare(b.departureTime || "")
        );
  const filtered = source === null ? null : filterRides(source, applied);
  const showSkeleton = searching || filtered === null;

  // A route-specific title/description when both cities are chosen — this is what
  // lets "/find?from=Tbilisi&to=Batumi" rank for "Tbilisi Batumi" searches.
  const hasRoute = applied.departure && applied.destination;
  const seoTitle = hasRoute
    ? `${cityLabel(applied.departure, lang)} → ${cityLabel(applied.destination, lang)}`
    : t("seoFindTitle");
  const seoDesc = hasRoute ? t("seoRouteDesc") : t("seoFindDesc");

  return (
    <div className={`container ${classes.page}`}>
      <Seo
        title={seoTitle}
        description={seoDesc}
        path={hasRoute ? `/find?from=${applied.departure}&to=${applied.destination}` : undefined}
      />

      <h1 className={classes.title}>{t("resultsFor")}</h1>
      <SearchBar values={search} onChange={setSearch} onSubmit={submit} allowAny />

      <div className={classes.filters}>
        <div className={classes.filterBlock}>
          <span className={classes.filterLabel}>{t("filterType")}</span>
          <div className={classes.filterGroup} role="group" aria-label={t("filterType")}>
            {[
              { value: "", label: t("typeAll") },
              { value: "carpool", label: `🚗 ${t("typeCarpool")}` },
              { value: "bus", label: `🚌 ${t("typeBus")}` },
            ].map((option) => (
              <button
                key={`type-${option.value}`}
                type="button"
                className={`${classes.filterChip} ${
                  applied.type === option.value ? classes.filterChipOn : ""
                }`}
                onClick={() => setFilter("type", option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={classes.filterDivider} aria-hidden="true" />

        <div className={classes.filterBlock}>
          <span className={classes.filterLabel}>{t("filterPrice")}</span>
          <div className={classes.filterGroup} role="group" aria-label={t("filterPrice")}>
            {[
              { value: "", label: t("priceAll") },
              { value: "free", label: t("priceFree") },
              { value: "paid", label: t("pricePaid") },
            ].map((option) => (
              <button
                key={`price-${option.value}`}
                type="button"
                className={`${classes.filterChip} ${
                  applied.priceMode === option.value ? classes.filterChipOn : ""
                }`}
                onClick={() => setFilter("price", option.value)}
            >
              {option.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      <div className={classes.results}>
        {showSkeleton ? <RideSkeleton /> : <RideList rides={filtered} />}
      </div>

      {/* When a search returns nothing, invite the user to post a ride request
          so drivers can see the demand. */}
      {!showSkeleton && filtered.length === 0 && (
        <div className={classes.requestCta}>
          {requestPosted ? (
            <>
              <p className={classes.ctaTitle}>{t("requestPosted")}</p>
              <Link to="/requests" className="btn btnGhost btnSm">
                {t("viewAllRequests")}
              </Link>
            </>
          ) : (
            <>
              <p className={classes.ctaTitle}>{t("postRequestHint")}</p>
              {uid ? (
                <button
                  type="button"
                  className="btn btnPrimary"
                  onClick={() => setShowRequestForm(true)}
                >
                  + {t("postRequest")}
                </button>
              ) : (
                <Link to="/signin" className="btn btnPrimary">
                  {t("signInToRequest")}
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {showRequestForm && (
        <RequestForm
          uid={uid}
          name={myName}
          initial={{
            from: applied.departure,
            to: applied.destination,
            date: applied.when === "date" ? applied.date : todayISO(),
          }}
          onClose={() => setShowRequestForm(false)}
          onPosted={() => {
            setShowRequestForm(false);
            setRequestPosted(true);
          }}
        />
      )}
    </div>
  );
};

export default FindPage;
