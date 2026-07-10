import { useEffect } from "react";
import classes from "./Lightbox.module.css";

// Fullscreen image viewer: Escape/backdrop closes, arrows navigate.
const Lightbox = ({ images, index, onClose, onNavigate }) => {
  const open = index !== null && index >= 0;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
      if (e.key === "ArrowRight" && index < images.length - 1) onNavigate(index + 1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, index, images.length, onClose, onNavigate]);

  if (!open) return null;

  return (
    <div className={classes.overlay} onClick={onClose} role="dialog" aria-label="Photo viewer">
      <button type="button" className={classes.close} onClick={onClose} aria-label="Close">
        ×
      </button>

      <img
        className={classes.image}
        src={images[index]}
        alt={`${index + 1} / ${images.length}`}
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <>
          <button
            type="button"
            className={`${classes.nav} ${classes.prev}`}
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(index - 1);
            }}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className={`${classes.nav} ${classes.next}`}
            disabled={index === images.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(index + 1);
            }}
            aria-label="Next photo"
          >
            ›
          </button>
          <span className={classes.counter}>
            {index + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
};

export default Lightbox;
