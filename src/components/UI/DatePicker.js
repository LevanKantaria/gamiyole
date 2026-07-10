import { useEffect, useRef, useState } from "react";
import classes from "./DatePicker.module.css";
import { useLang, MONTHS, DAYS_SHORT, formatDate } from "../../i18n";

const pad = (n) => String(n).padStart(2, "0");
const iso = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;
const todayLocalISO = () => {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
};

// Months the calendar can navigate ahead — rides aren't published further out.
const MAX_MONTHS_AHEAD = 6;

// Monday-first weekday header, values are Date#getDay() indices.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

// BlaBlaCar-style popover calendar: month grid, past days disabled, today
// outlined, selected day filled. Emits an ISO date string via onChange.
const DatePicker = ({ id, value, onChange, className = "", placeholder = "—" }) => {
  const lang = useLang();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = value ? new Date(`${value}T00:00:00`) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const d = value ? new Date(`${value}T00:00:00`) : new Date();
      setView({ year: d.getFullYear(), month: d.getMonth() });
    }
    setOpen((o) => !o);
  };

  const today = todayLocalISO();
  const now = new Date();
  const monthOffset =
    (view.year - now.getFullYear()) * 12 + (view.month - now.getMonth());
  const canPrev = monthOffset > 0;
  const canNext = monthOffset < MAX_MONTHS_AHEAD;

  const move = (delta) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  // Leading blanks before day 1, Monday-first.
  const leading = (new Date(view.year, view.month, 1).getDay() + 6) % 7;

  const pick = (day) => {
    onChange(iso(view.year, view.month, day));
    setOpen(false);
  };

  return (
    <div className={classes.wrap} ref={wrapRef}>
      <button
        type="button"
        id={id}
        className={`input ${classes.trigger} ${className}`}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className={value ? "" : classes.placeholder}>
          {value ? formatDate(value, lang) : placeholder}
        </span>
      </button>

      {open && (
        <div className={`card ${classes.pop}`} role="dialog" aria-label="Calendar">
          <div className={classes.head}>
            <button
              type="button"
              className={classes.nav}
              onClick={() => move(-1)}
              disabled={!canPrev}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className={classes.monthLabel}>
              {MONTHS[lang][view.month]} {view.year}
            </span>
            <button
              type="button"
              className={classes.nav}
              onClick={() => move(1)}
              disabled={!canNext}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className={classes.grid}>
            {WEEK.map((d) => (
              <span key={`dow-${d}`} className={classes.dow}>
                {DAYS_SHORT[lang][d]}
              </span>
            ))}
            {Array.from({ length: leading }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateISO = iso(view.year, view.month, day);
              const disabled = dateISO < today;
              return (
                <button
                  key={dateISO}
                  type="button"
                  className={`${classes.day} ${dateISO === value ? classes.selected : ""} ${
                    dateISO === today ? classes.today : ""
                  }`}
                  disabled={disabled}
                  onClick={() => pick(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
