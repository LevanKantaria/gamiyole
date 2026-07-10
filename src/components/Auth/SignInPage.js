import { useState } from "react";
import { Link, useHistory, Redirect } from "react-router-dom";
import { useSelector } from "react-redux";
import classes from "./Auth.module.css";
import { useT } from "../../i18n";
import { emailSignIn, authErrorKey } from "../../auth/email";
import GoogleSignInButton from "./GoogleSignInButton";

const SignInPage = () => {
  const t = useT();
  const history = useHistory();
  const { uid, initialized } = useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (initialized && uid && !loading) {
    return <Redirect to="/" />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError(t("errInvalidEmail"));
    if (!password) return setError(t("errInvalidCredentials"));
    setLoading(true);
    try {
      const { needsProfile } = await emailSignIn(email.trim(), password);
      history.push(needsProfile ? "/complete-profile" : "/");
    } catch (err) {
      setError(t(authErrorKey(err)));
      setLoading(false);
    }
  };

  const onGoogle = (needsProfile) =>
    history.push(needsProfile ? "/complete-profile" : "/");

  return (
    <div className={`container ${classes.page}`}>
      <div className={`card ${classes.authCard}`}>
        <h1 className={classes.title}>{t("signInTitle")}</h1>

        {error && <div className={`alert alertError ${classes.alert}`}>{error}</div>}

        <form onSubmit={submit} noValidate>
          <label className="label" htmlFor="signin-email">
            {t("email")}
          </label>
          <input
            id="signin-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className={`label ${classes.spaced}`} htmlFor="signin-password">
            {t("password")}
          </label>
          <input
            id="signin-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className={`btn btnPrimary ${classes.submit}`} disabled={loading}>
            {loading ? t("signingIn") : t("signIn")}
          </button>
        </form>

        <div className={classes.divider}>{t("orContinueWith")}</div>
        <GoogleSignInButton onSuccess={onGoogle} onError={setError} />

        <p className={classes.switch}>
          {t("noAccount")} <Link to="/signup">{t("signUp")}</Link>
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
