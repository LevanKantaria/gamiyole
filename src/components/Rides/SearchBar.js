import classes from "./SearchBar.module.css";
import { useT } from "../../i18n";
import DatePicker from "../UI/DatePicker";
import CityCombobox from "../UI/CityCombobox";

// Shared route search controls used on the home hero and the find page.
// values: { departure, destination, when: any|today|tomorrow|week|date, date }
const SearchBar = ({ values, onChange, onSubmit, allowAny = false }) => {
  const t = useT();

  const swap = () =>
    onChange({ ...values, departure: values.destination, destination: values.departure });

  const submit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className={classes.bar} onSubmit={submit}>
      <div className={`${classes.field} ${classes.cityField}`}>
        <label className="label" htmlFor="search-from">
          {t("from")}
        </label>
        <CityCombobox
          id="search-from"
          value={values.departure}
          onChange={(departure) => onChange({ ...values, departure })}
          placeholder={allowAny ? t("anyCity") : t("selectCity")}
          exclude={values.destination}
        />
      </div>

      <button type="button" className={classes.swap} onClick={swap} title={t("swap")} aria-label={t("swap")}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z" />
        </svg>
      </button>

      <div className={`${classes.field} ${classes.cityField}`}>
        <label className="label" htmlFor="search-to">
          {t("to")}
        </label>
        <CityCombobox
          id="search-to"
          value={values.destination}
          onChange={(destination) => onChange({ ...values, destination })}
          placeholder={allowAny ? t("anyCity") : t("selectCity")}
          exclude={values.departure}
        />
      </div>

      <div className={classes.field}>
        <label className="label" htmlFor="search-when">
          {t("when")}
        </label>
        <select
          id="search-when"
          className={`select ${classes.citySelect}`}
          value={values.when}
          onChange={(e) => onChange({ ...values, when: e.target.value })}
        >
          <option value="any">{t("dateAny")}</option>
          <option value="today">{t("dateToday")}</option>
          <option value="tomorrow">{t("dateTomorrow")}</option>
          <option value="week">{t("dateWeek")}</option>
          <option value="date">{t("datePick")}</option>
        </select>
      </div>

      {values.when === "date" && (
        <div className={classes.field}>
          <label className="label" htmlFor="search-date">
            {t("date")}
          </label>
          <DatePicker
            id="search-date"
            className={classes.date}
            value={values.date}
            onChange={(date) => onChange({ ...values, date })}
            placeholder={t("datePick")}
          />
        </div>
      )}

      <button type="submit" className={`btn btnPrimary ${classes.submit}`}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
        </svg>
        {t("search")}
      </button>
    </form>
  );
};

export default SearchBar;
