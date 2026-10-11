import { useEffect, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import classes from "./RequestsPage.module.css";
import { useT } from "../../i18n";
import Seo from "../UI/Seo";
import { subscribeRequests, subscribeExternalRequests, filterRequests } from "../../services/requests";
import { todayISO } from "../../services/rides";
import SearchBar from "../Rides/SearchBar";
import RequestCard from "./RequestCard";
import ExternalRequestCard from "./ExternalRequestCard";
import RequestForm from "./RequestForm";

const STEPS = ["reqHow1", "reqHow2", "reqHow3"];

const RequestsPage = () => {
  const t = useT();
  const history = useHistory();
  const location = useLocation();
  const { uid, initialized } = useSelector((state) => state.auth);
  const name = useSelector((state) => state.profile.data?.name);
  const [requests, setRequests] = useState(null);
  const [externalRequests, setExternalRequests] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [posted, setPosted] = useState(false);
  const params = new URLSearchParams(location.search);
  const applied = {
    departure: params.get("from") || "",
    destination: params.get("to") || "",
    when: params.get("when") || "any",
    date: params.get("date") || "",
  };
  const [search, setSearch] = useState({ ...applied, date: applied.date || todayISO() });

  useEffect(() => subscribeRequests(setRequests), []);
  useEffect(() => subscribeExternalRequests(setExternalRequests), []);
  useEffect(() => {
    const next = new URLSearchParams(location.search);
    setSearch({
      departure: next.get("from") || "",
      destination: next.get("to") || "",
      when: next.get("when") || "any",
      date: next.get("date") || todayISO(),
    });
  }, [location.search]);

  const submitSearch = () => {
    const next = new URLSearchParams();
    if (search.departure) next.set("from", search.departure);
    if (search.destination) next.set("to", search.destination);
    if (search.when !== "any") next.set("when", search.when);
    if (search.when === "date" && search.date) next.set("date", search.date);
    history.replace(next.toString() ? `/requests?${next}` : "/requests");
  };
  const clearSearch = () => {
    setSearch({ departure: "", destination: "", when: "any", date: todayISO() });
    history.replace("/requests");
  };

  const allRequests = requests && externalRequests
    ? [...requests, ...externalRequests].sort((a, b) =>
        (a.dateFrom || "").localeCompare(b.dateFrom || "") ||
        (a.createdAt || "").localeCompare(b.createdAt || ""))
    : null;
  const visibleRequests = allRequests === null ? null : filterRequests(allRequests, applied);
  const hasFilters = !!(applied.departure || applied.destination || applied.when !== "any");

  if (!initialized) return <div className="spinner" />;

  if (!uid) {
    return (
      <div className={`container ${classes.gate}`}>
        <Seo title={t("seoRequestsTitle")} description={t("seoRequestsDesc")} />
        <div className={`card ${classes.gateCard}`}>
          <h2>{t("signInToRequest")}</h2>
          <Link to="/signin" className="btn btnPrimary">
            {t("signIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${classes.page}`}>
      <Seo title={t("seoRequestsTitle")} description={t("seoRequestsDesc")} />
      <h1 className={classes.title}>{t("requestsTitle")}</h1>
      <p className={classes.subtitle}>{t("requestsSubtitle")}</p>

      <div className={`card ${classes.hero}`}>
        <div className={classes.steps}>
          <span className={classes.stepsLabel}>{t("howItWorks")}</span>
          <ol className={classes.stepsList}>
            {STEPS.map((key, i) => (
              <li key={key} className={classes.step}>
                <span className={classes.stepNum}>{i + 1}</span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ol>
        </div>
        <button type="button" className={`btn btnPrimary ${classes.heroBtn}`} onClick={() => setShowForm(true)}>
          + {t("postRequest")}
        </button>
      </div>

      {posted && <div className="alert alertSuccess">{t("requestPosted")}</div>}

      <div className={classes.search}>
        <SearchBar values={search} onChange={setSearch} onSubmit={submitSearch} allowAny />
        {hasFilters && <button type="button" className={classes.clearFilters} onClick={clearSearch}>
          {t("clearFilters")}
        </button>}
      </div>

      <div className={classes.listHead}>
        <h2 className={classes.listTitle}>{t("recentRequests")}</h2>
        {visibleRequests && visibleRequests.length > 0 && (
          <span className="badge badgeGrey">{visibleRequests.length}</span>
        )}
      </div>

      {visibleRequests === null ? (
        <div className="spinner" />
      ) : visibleRequests.length === 0 ? (
        <div className={classes.empty}>
          <p className={classes.emptyTitle}>{t(hasFilters ? "noMatchingRequests" : "noRequests")}</p>
          <p className={classes.emptyHint}>{t(hasFilters ? "changeRequestFilters" : "noRequestsHint")}</p>
          {hasFilters && <button type="button" className="btn btnGhost btnSm" onClick={clearSearch}>
            {t("clearFilters")}
          </button>}
        </div>
      ) : (
        <div className={classes.list}>
          {visibleRequests.map((request) => (
            request.source === "facebook"
              ? <ExternalRequestCard key={`fb-${request.id}`} request={request} />
              : <RequestCard key={request.id} request={request} currentUid={uid} />
          ))}
        </div>
      )}

      {showForm && (
        <RequestForm
          uid={uid}
          name={name}
          onClose={() => setShowForm(false)}
          onPosted={() => {
            setShowForm(false);
            setPosted(true);
          }}
        />
      )}
    </div>
  );
};

export default RequestsPage;
