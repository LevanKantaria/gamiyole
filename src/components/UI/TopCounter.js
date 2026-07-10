import { memo, useEffect, useRef } from "react";

// TOP.GE site-ranking counter. Memoized with no props so it renders exactly
// once — React never re-reconciles the container, so it won't wipe the badge
// the external script draws into it. The script is async, loaded once after
// mount (the container exists first, so counter.js finds it).
const TopCounter = memo(function TopCounter() {
  const ref = useRef(null);

  useEffect(() => {
    if (document.getElementById("top-ge-counter-script")) return;
    const s = document.createElement("script");
    s.id = "top-ge-counter-script";
    s.async = true;
    s.src = "https://counter.top.ge/counter.js";
    document.body.appendChild(s);
  }, []);

  return <div id="top-ge-counter-container" data-site-id="118836" ref={ref} />;
});

export default TopCounter;
