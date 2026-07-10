import classes from "./Avatar.module.css";

// Image avatar with an initial-letter fallback — no external placeholder images.
const Avatar = ({ src, name = "", size = 40 }) => {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const style = { width: size, height: size, fontSize: size * 0.42 };

  if (src) {
    return <img className={classes.img} style={style} src={src} alt={name || "avatar"} />;
  }
  return (
    <div className={classes.fallback} style={style} aria-label={name || "avatar"}>
      {initial}
    </div>
  );
};

export default Avatar;
