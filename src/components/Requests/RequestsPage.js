import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import classes from "./RequestsPage.module.css";
import { useT } from "../../i18n";
import Seo from "../UI/Seo";
import { subscribeRequests } from "../../services/requests";
import RequestCard from "./RequestCard";
import RequestForm from "./RequestForm";

const STEPS = ["reqHow1", "reqHow2", "reqHow3"];

const RequestsPage = () => {
  const t = useT();
  const { uid, initialized } = useSelector((state) => state.auth);
  const name = useSelector((state) => state.profile.data?.name);
  const [requests, setRequests] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [posted, setPosted] = useState(false);

  useEffect(() => subscribeRequests(setRequests), []);

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

      <div className={classes.listHead}>
        <h2 className={classes.listTitle}>{t("recentRequests")}</h2>
        {requests && requests.length > 0 && (
          <span className="badge badgeGrey">{requests.length}</span>
        )}
      </div>

      {requests === null ? (
        <div className="spinner" />
      ) : requests.length === 0 ? (
        <div className={classes.empty}>
          <p className={classes.emptyTitle}>{t("noRequests")}</p>
          <p className={classes.emptyHint}>{t("noRequestsHint")}</p>
        </div>
      ) : (
        <div className={classes.list}>
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} currentUid={uid} />
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
