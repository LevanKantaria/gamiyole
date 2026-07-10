import { useEffect, useRef, useState } from "react";
import classes from "./CityCombobox.module.css";
import { useT, useLang, CITIES, cityLabel } from "../../i18n";

const norm = (s) => (s || "").toLowerCase().trim();

// Searchable city picker: type to filter (matches Georgian and English names
// regardless of UI language), arrow keys + Enter to select, × to clear.
const CityCombobox = ({ id, value, onChange, placeholder, exclude, className = "" }) => {
  const t = useT();
  const lang = useLang();
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const options = CITIES.filter((c) => c.value !== exclude).filter((c) => {
    const q = norm(query);
    return !q || norm(c.value).includes(q) || norm(c.ge).includes(q);
  });

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const select = (cityValue) => {
    onChange(cityValue);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[highlight]) select(options[highlight].value);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  return (
    <div className={classes.wrap} ref={wrapRef}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        autoComplete="off"
        className={`input ${classes.field} ${className}`}
        placeholder={value && !open ? undefined : placeholder}
        value={open ? query : value ? cityLabel(value, lang) : ""}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlight(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
      />

      {value && !open ? (
        <button
          type="button"
          className={classes.clear}
          aria-label="Clear"
          onClick={() => onChange("")}
        >
          ×
        </button>
      ) : (
        <span className={classes.chevron} aria-hidden="true">
          ▾
        </span>
      )}

      {open && (
        <ul className={`card ${classes.list}`} role="listbox" id={`${id}-listbox`}>
          {options.length === 0 && <li className={classes.empty}>{t("noCityMatch")}</li>}
          {options.map((c, i) => (
            <li key={c.value}>
              <button
                type="button"
                role="option"
                aria-selected={c.value === value}
                className={`${classes.option} ${i === highlight ? classes.highlighted : ""} ${
                  c.value === value ? classes.selectedOption : ""
                }`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(c.value)}
              >
                {lang === "GE" ? c.ge : c.value}
                <span className={classes.altName}>{lang === "GE" ? c.value : c.ge}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CityCombobox;
