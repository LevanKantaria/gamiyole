import classes from "./RideSkeleton.module.css";

// Shimmering placeholder cards shown while rides load or a search runs.
const RideSkeleton = ({ count = 3 }) => (
  <div className={classes.list} aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={classes.card} style={{ animationDelay: `${i * 80}ms` }}>
        <div className={classes.top}>
          <div className={classes.lines}>
            <span className={`${classes.bar} ${classes.w45}`} />
            <span className={`${classes.bar} ${classes.w60}`} />
          </div>
          <span className={`${classes.bar} ${classes.price}`} />
        </div>
        <div className={classes.bottom}>
          <span className={classes.avatar} />
          <span className={`${classes.bar} ${classes.w25}`} />
          <span className={`${classes.bar} ${classes.button}`} />
        </div>
      </div>
    ))}
  </div>
);

export default RideSkeleton;
