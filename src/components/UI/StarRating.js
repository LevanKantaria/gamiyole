import classes from "./StarRating.module.css";

const Star = ({ fill }) => (
  <span className={classes.star}>
    <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`sg${fill}`}>
          <stop offset={`${fill * 100}%`} stopColor="var(--star)" />
          <stop offset={`${fill * 100}%`} stopColor="var(--line)" />
        </linearGradient>
      </defs>
      <path
        fill={fill >= 1 ? "var(--star)" : fill <= 0 ? "var(--line)" : `url(#sg${fill})`}
        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
      />
    </svg>
  </span>
);

// Read-only star row (value can be fractional) or, with onChange, an input.
const StarRating = ({ value = 0, onChange, size = 18 }) => {
  const stars = [1, 2, 3, 4, 5];
  if (!onChange) {
    return (
      <span className={classes.row} style={{ fontSize: size }}>
        {stars.map((s) => (
          <Star key={s} fill={Math.max(0, Math.min(1, value - s + 1))} />
        ))}
      </span>
    );
  }
  return (
    <span className={classes.row} style={{ fontSize: size }} role="radiogroup">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          className={classes.starButton}
          onClick={() => onChange(s)}
          role="radio"
          aria-checked={value === s}
          aria-label={`${s} stars`}
        >
          <Star fill={value >= s ? 1 : 0} />
        </button>
      ))}
    </span>
  );
};

export default StarRating;
