import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE = "https://gamiyole.me";

// Per-route <title>, meta description, canonical and Open Graph tags. Google
// renders the app's JS and picks these up, so each page can rank for its own
// terms instead of everything sharing the homepage title.
const Seo = ({ title, description, path }) => {
  const { pathname } = useLocation();
  // `path` lets a page self-canonicalize a specific URL (e.g. a route search
  // "/find?from=Tbilisi&to=Batumi") so it can rank on its own; defaults to the
  // clean pathname otherwise.
  const url = `${SITE}${path || pathname}`;
  const fullTitle = title ? `${title} · Gamiyole` : "Gamiyole";

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
    </Helmet>
  );
};

export default Seo;
