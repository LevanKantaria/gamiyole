import { useState } from "react";
import { Link, useHistory, Redirect } from "react-router-dom";
import { useSelector } from "react-redux";
import classes from "./Auth.module.css";
import { useT } from "../../i18n";
import { emailSignUp, authErrorKey } from "../../auth/email";
import GoogleSignInButton from "./GoogleSignInButton";

const SignUpPage = () => {
  const t = useT();
  const history = useHistory();
  const { uid, initialized } = useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (initialized && uid && !loading) {
    return <Redirect to="/" />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t("errInvalidEmail"));
    if (password.length < 6) return setError(t("errWeakPassword"));
    if (password !== confirm) return setError(t("errPasswordMatch"));
    setLoading(true);
    try {
      await emailSignUp(email.trim(), password);
      history.push("/complete-profile");
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
        <h1 className={classes.title}>{t("signUpTitle")}</h1>

        {error && <div className={`alert alertError ${classes.alert}`}>{error}</div>}

        <form onSubmit={submit} noValidate>
          <label className="label" htmlFor="signup-email">
            {t("email")}
          </label>
          <input
            id="signup-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className={`label ${classes.spaced}`} htmlFor="signup-password">
            {t("password")}
          </label>
          <input
            id="signup-password"
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className={`label ${classes.spaced}`} htmlFor="signup-confirm">
            {t("confirmPassword")}
          </label>
          <input
            id="signup-confirm"
            className={`input ${confirm && confirm !== password ? "inputError" : ""}`}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button type="submit" className={`btn btnPrimary ${classes.submit}`} disabled={loading}>
            {loading ? t("creatingAccount") : t("signUp")}
          </button>
        </form>

        <div className={classes.divider}>{t("orContinueWith")}</div>
        <GoogleSignInButton onSuccess={onGoogle} onError={setError} />

        <p className={classes.switch}>
          {t("haveAccount")} <Link to="/signin">{t("signIn")}</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
