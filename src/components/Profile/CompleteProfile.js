import { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import classes from "./CompleteProfile.module.css";
import { useT } from "../../i18n";
import { saveProfile, normalizeFacebookUrl } from "../../services/profile";

const PLATE_RE = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/;

const CompleteProfile = () => {
  const t = useT();
  const history = useHistory();
  const { uid, initialized } = useSelector((state) => state.auth);
  const profile = useSelector((state) => state.profile.data);
  const profileLoaded = useSelector((state) => state.profile.loaded);

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  // Prefill once the user's own profile arrives from the live subscription.
  useEffect(() => {
    if (form === null && profileLoaded) {
      setForm({
        name: profile?.name || "",
        age: profile?.age || "",
        number: profile?.number || "",
        aboutMe: profile?.aboutMe || "",
        userType: profile?.userType || (profile?.model ? "driver" : "passenger"),
        model: profile?.model || "",
        plate: profile?.plate === "--" ? "" : profile?.plate || "",
        facebook: profile?.facebook || "",
      });
    }
  }, [form, profileLoaded, profile]);

  if (!initialized) return <div className="spinner" />;

  if (!uid) {
    return (
      <div className={`container ${classes.gate}`}>
        <div className={`card ${classes.gateCard}`}>
          <h2>{t("signIn")}</h2>
          <Link to="/signin" className="btn btnPrimary">
            {t("signIn")}
          </Link>
        </div>
      </div>
    );
  }

  if (form === null) return <div className="spinner" />;

  const isDriver = form.userType === "driver";

  const set = (field) => (e) => {
    let { value } = e.target;
    if (field === "plate") value = value.toUpperCase();
    setForm({ ...form, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = t("errName");
    if (!form.age || Number(form.age) < 18 || Number(form.age) > 100) errs.age = t("errAge");
    if (!/^\d{9}$/.test(form.number.replace(/\s/g, ""))) errs.number = t("errPhone");
    if (form.aboutMe.trim().length < 4) errs.aboutMe = t("errAbout");
    if (isDriver) {
      if (form.model.trim().length < 2) errs.model = t("errCarModel");
      if (!PLATE_RE.test(form.plate.trim())) errs.plate = t("errPlate");
    }
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setFailed(false);
    try {
      await saveProfile(uid, {
        name: form.name.trim(),
        age: form.age,
        number: form.number.replace(/\s/g, ""),
        aboutMe: form.aboutMe.trim(),
        userType: form.userType,
        model: isDriver ? form.model.trim() : "",
        plate: isDriver ? form.plate.trim() : "",
        facebook: normalizeFacebookUrl(form.facebook),
      });
      history.push(`/profile/${uid}`);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <div className={`container ${classes.page}`}>
      <div className={`card ${classes.formCard}`}>
        <h1 className={classes.title}>{t("completeProfileTitle")}</h1>
        <p className={classes.hint}>{t("completeProfileHint")}</p>

        {failed && <div className="alert alertError">{t("errGeneric")}</div>}

        <form onSubmit={submit} noValidate>
          <div className={classes.row}>
            <div className={classes.field}>
              <label className="label" htmlFor="cp-name">
                {t("fullName")}
              </label>
              <input
                id="cp-name"
                className={`input ${errors.name ? "inputError" : ""}`}
                type="text"
                value={form.name}
                onChange={set("name")}
              />
              {errors.name && <p className="fieldError">{errors.name}</p>}
            </div>
            <div className={classes.fieldNarrow}>
              <label className="label" htmlFor="cp-age">
                {t("age")}
              </label>
              <input
                id="cp-age"
                className={`input ${errors.age ? "inputError" : ""}`}
                type="number"
                min="18"
                max="100"
                value={form.age}
                onChange={set("age")}
              />
              {errors.age && <p className="fieldError">{errors.age}</p>}
            </div>
          </div>

          <div className={classes.block}>
            <label className="label" htmlFor="cp-phone">
              {t("phone")}
            </label>
            <input
              id="cp-phone"
              className={`input ${errors.number ? "inputError" : ""}`}
              type="tel"
              placeholder="555123456"
              value={form.number}
              onChange={set("number")}
            />
            {errors.number && <p className="fieldError">{errors.number}</p>}
          </div>

          <div className={classes.block}>
            <label className="label" htmlFor="cp-about">
              {t("aboutMe")}
            </label>
            <textarea
              id="cp-about"
              className={`textarea ${errors.aboutMe ? "inputError" : ""}`}
              value={form.aboutMe}
              onChange={set("aboutMe")}
              maxLength={400}
            />
            {errors.aboutMe && <p className="fieldError">{errors.aboutMe}</p>}
          </div>

          <div className={classes.block}>
            <label className="label" htmlFor="cp-facebook">
              {t("facebook")}
            </label>
            <input
              id="cp-facebook"
              className="input"
              type="text"
              inputMode="url"
              autoCapitalize="none"
              placeholder={t("facebookHint")}
              value={form.facebook}
              onChange={set("facebook")}
            />
          </div>

          <div className={classes.block}>
            <span className="label">{t("iAmA")}</span>
            <div className={classes.roleRow}>
              {[
                { value: "passenger", label: t("passenger"), hint: t("passengerHint") },
                { value: "driver", label: t("driver"), hint: t("driverHint") },
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  className={`${classes.roleOption} ${
                    form.userType === role.value ? classes.roleSelected : ""
                  }`}
                  onClick={() => setForm({ ...form, userType: role.value })}
                >
                  <strong>{role.label}</strong>
                  <span>{role.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {isDriver && (
            <div className={classes.row}>
              <div className={classes.field}>
                <label className="label" htmlFor="cp-model">
                  {t("carModel")}
                </label>
                <input
                  id="cp-model"
                  className={`input ${errors.model ? "inputError" : ""}`}
                  type="text"
                  placeholder="Toyota Camry 2019"
                  value={form.model}
                  onChange={set("model")}
                />
                {errors.model && <p className="fieldError">{errors.model}</p>}
              </div>
              <div className={classes.field}>
                <label className="label" htmlFor="cp-plate">
                  {t("numberPlate")}
                </label>
                <input
                  id="cp-plate"
                  className={`input ${classes.plateInput} ${errors.plate ? "inputError" : ""}`}
                  type="text"
                  placeholder="AA-123-AA"
                  maxLength={9}
                  value={form.plate}
                  onChange={set("plate")}
                />
                {errors.plate && <p className="fieldError">{errors.plate}</p>}
              </div>
            </div>
          )}

          <button type="submit" className={`btn btnPrimary ${classes.submit}`} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
