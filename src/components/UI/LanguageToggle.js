import { useDispatch, useSelector } from "react-redux";
import { langActions } from "../store";
import classes from "./LanguageToggle.module.css";

const LanguageToggle = () => {
  const dispatch = useDispatch();
  const lang = useSelector((state) => state.lang.lang);

  return (
    <div className={classes.toggle} role="group" aria-label="Language">
      {["GE", "EN"].map((code) => (
        <button
          key={code}
          type="button"
          className={`${classes.option} ${lang === code ? classes.selected : ""}`}
          onClick={() => dispatch(langActions.langToggle(code))}
          aria-pressed={lang === code}
        >
          {code === "GE" ? "ქარ" : "EN"}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
