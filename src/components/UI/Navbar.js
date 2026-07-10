import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useHistory, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import classes from "./Navbar.module.css";
import { useT } from "../../i18n";
import { logOut } from "../../auth/email";
import { profileActions } from "../store";
import Avatar from "./Avatar";
import LanguageToggle from "./LanguageToggle";

const CarLogo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11m-14 0h14m-14 0a2 2 0 0 0-2 2v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3a2 2 0 0 0-2-2M7.5 13.5h.01m9 0h.01"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Navbar = () => {
  const t = useT();
  const history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();
  const { uid, isAdmin } = useSelector((state) => state.auth);
  const avatarUrl = useSelector((state) => state.profile.avatarUrl);
  const name = useSelector((state) => state.profile.data?.name);

  // menuOpen: desktop avatar dropdown. mobileOpen: mobile hamburger sheet.
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target)) setMobileOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Close the mobile sheet whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const signOutHandler = async () => {
    setMenuOpen(false);
    setMobileOpen(false);
    await logOut();
    dispatch(profileActions.clearProfile());
    history.push("/");
  };

  return (
    <header className={classes.header}>
      <div className={`container ${classes.inner}`}>
        <Link to="/" className={classes.logo}>
          <CarLogo />
          <span>gamiyole</span>
        </Link>

        <nav className={classes.nav}>
          <NavLink to="/find" className={classes.link} activeClassName={classes.active}>
            {t("findRide")}
          </NavLink>
          <NavLink to="/publish" className={classes.link} activeClassName={classes.active}>
            {t("publishRide")}
          </NavLink>
          <NavLink to="/requests" className={classes.link} activeClassName={classes.active}>
            {t("requestsNav")}
          </NavLink>
        </nav>

        <div className={classes.right}>
          <LanguageToggle />

          {/* Desktop auth controls */}
          {!uid && (
            <Link to="/signin" className={`btn btnPrimary btnSm ${classes.desktopAuth}`}>
              {t("signIn")}
            </Link>
          )}
          {uid && (
            <div className={`${classes.menuWrap} ${classes.desktopAuth}`} ref={menuRef}>
              <button
                type="button"
                className={classes.avatarButton}
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar src={avatarUrl} name={name} size={36} />
              </button>
              {menuOpen && (
                <div className={classes.menu} role="menu">
                  <Link
                    to={`/profile/${uid}`}
                    className={classes.menuItem}
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("profile")}
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={classes.menuItem}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("adminPanel")}
                    </Link>
                  )}
                  <button
                    type="button"
                    className={`${classes.menuItem} ${classes.menuDanger}`}
                    onClick={signOutHandler}
                  >
                    {t("signOut")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <div className={classes.mobileWrap} ref={mobileRef}>
            <button
              type="button"
              className={classes.burger}
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Menu"
              aria-haspopup="menu"
              aria-expanded={mobileOpen}
            >
              <span className={`${classes.burgerLine} ${mobileOpen ? classes.burgerTop : ""}`} />
              <span className={`${classes.burgerLine} ${mobileOpen ? classes.burgerHide : ""}`} />
              <span className={`${classes.burgerLine} ${mobileOpen ? classes.burgerBottom : ""}`} />
            </button>

            {mobileOpen && (
              <div className={classes.mobileMenu} role="menu">
                <NavLink
                  to="/find"
                  className={classes.menuItem}
                  activeClassName={classes.menuItemActive}
                >
                  {t("findRide")}
                </NavLink>
                <NavLink
                  to="/publish"
                  className={classes.menuItem}
                  activeClassName={classes.menuItemActive}
                >
                  {t("publishRide")}
                </NavLink>
                <NavLink
                  to="/requests"
                  className={classes.menuItem}
                  activeClassName={classes.menuItemActive}
                >
                  {t("requestsNav")}
                </NavLink>
                <div className={classes.menuDivider} />
                {!uid && (
                  <Link to="/signin" className={classes.menuItem}>
                    {t("signIn")}
                  </Link>
                )}
                {uid && (
                  <>
                    <Link to={`/profile/${uid}`} className={classes.menuItem}>
                      {t("profile")}
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className={classes.menuItem}>
                        {t("adminPanel")}
                      </Link>
                    )}
                    <button
                      type="button"
                      className={`${classes.menuItem} ${classes.menuDanger}`}
                      onClick={signOutHandler}
                    >
                      {t("signOut")}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
