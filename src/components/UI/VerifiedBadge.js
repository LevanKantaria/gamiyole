import { useT } from "../../i18n";
import classes from "./VerifiedBadge.module.css";

// Small blue check shown next to a verified member's name. `size` in px.
const VerifiedBadge = ({ size = 16, withLabel = false }) => {
  const t = useT();
  return (
    <span className={classes.wrap} title={t("verified")}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={classes.icon}
        aria-label={t("verified")}
      >
        <path
          fill="#1d9bf0"
          d="M12 1l2.4 1.8 3-.3 1 2.8 2.8 1-.3 3L24 12l-1.8 2.4.3 3-2.8 1-1 2.8-3-.3L12 23l-2.4-1.8-3 .3-1-2.8-2.8-1 .3-3L0 12l1.8-2.4-.3-3 2.8-1 1-2.8 3 .3z"
        />
        <path
          fill="#fff"
          d="M10.6 15.6l-3-3 1.4-1.4 1.6 1.6 4-4L16 10.2z"
        />
      </svg>
      {withLabel && <span className={classes.label}>{t("verified")}</span>}
    </span>
  );
};

export default VerifiedBadge;
