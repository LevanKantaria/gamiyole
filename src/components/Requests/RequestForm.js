import { useState } from "react";
import classes from "./RequestForm.module.css";
import { useT } from "../../i18n";
import { todayISO } from "../../services/rides";
import { createRequest } from "../../services/requests";
import CityCombobox from "../UI/CityCombobox";
import DatePicker from "../UI/DatePicker";

// Modal form to post a ride request. `initial` prefills from a failed search.
const RequestForm = ({ uid, name, initial, onClose, onPosted }) => {
  const t = useT();
  const [form, setForm] = useState({
    from: initial?.from || "",
    to: initial?.to || "",
    dateFrom: initial?.date || todayISO(),
    dateTo: initial?.date || todayISO(),
    note: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, dates: undefined, cities: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.from || !form.to) errs.cities = t("errRequestCities");
    else if (form.from === form.to) errs.cities = t("errRequestSameCity");
    if (form.dateFrom < todayISO()) errs.dates = t("errRequestPast");
    else if (form.dateTo < form.dateFrom) errs.dates = t("errRequestDates");
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      await createRequest(uid, { name, ...form });
      onPosted();
    } catch {
      setErrors({ cities: t("errGeneric") });
      setSubmitting(false);
    }
  };

  return (
    <div className={classes.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={`card ${classes.modal}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={classes.close} onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className={classes.title}>{t("postRequest")}</h2>
        <p className={classes.hint}>{t("postRequestHint")}</p>

        <form onSubmit={submit} noValidate>
          <div className={classes.row}>
            <div className={classes.field}>
              <label className="label">{t("from")}</label>
              <CityCombobox
                value={form.from}
                onChange={(v) => setField("from", v)}
                placeholder={t("selectCity")}
                exclude={form.to}
                className={errors.cities ? "inputError" : ""}
              />
            </div>
            <div className={classes.field}>
              <label className="label">{t("to")}</label>
              <CityCombobox
                value={form.to}
                onChange={(v) => setField("to", v)}
                placeholder={t("selectCity")}
                exclude={form.from}
                className={errors.cities ? "inputError" : ""}
              />
            </div>
          </div>
          {errors.cities && <p className="fieldError">{errors.cities}</p>}

          <div className={classes.row}>
            <div className={classes.field}>
              <label className="label">{t("dateFrom")}</label>
              <DatePicker
                value={form.dateFrom}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    dateFrom: v,
                    // Keep the range valid: pull dateTo forward if it's now behind.
                    dateTo: prev.dateTo < v ? v : prev.dateTo,
                  }))
                }
                className={errors.dates ? "inputError" : ""}
              />
            </div>
            <div className={classes.field}>
              <label className="label">{t("dateTo")}</label>
              <DatePicker
                value={form.dateTo}
                onChange={(v) => setField("dateTo", v)}
                className={errors.dates ? "inputError" : ""}
              />
            </div>
          </div>
          {errors.dates && <p className="fieldError">{errors.dates}</p>}

          <div className={classes.block}>
            <label className="label">{t("requestNote")}</label>
            <textarea
              className="textarea"
              rows={2}
              maxLength={200}
              placeholder={t("requestNotePlaceholder")}
              value={form.note}
              onChange={(e) => setField("note", e.target.value)}
            />
          </div>

          <button type="submit" className={`btn btnPrimary ${classes.submit}`} disabled={submitting}>
            {submitting ? t("posting") : t("submitRequest")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RequestForm;
