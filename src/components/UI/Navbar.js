import classes from "./Navbar.module.css";
import { Link, NavLink, useLocation } from "react-router-dom";
import SignIn from "./SignIn";
import { useSelector } from "react-redux";
import Logout from "./Logout";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import Avatar from "@mui/material/Avatar";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { useHistory } from "react-router-dom";
import LanguageToggle from "./LanguageToggle";

const NavbarBoot = (props) => {
  const lang = useSelector((state) => state.lang.lang);
  const location = useLocation();
  let NavbarTxt = {
    EN: {
      publish:'Publish',
      find: "Find",
      about: "About",
      logInToPublish:'Log In to Publish',
      profile:'Profile',
      brand: "Gamiyole",
      
    },

    GE: {
      publish:'ატვირთე',
      find: "მოძებნე",
      about: "შესახებ",
      logInToPublish: 'ასატვირთად გაიარე ავტორიზაცია',
      profile:'პროფილი',
      brand: "Gamiyole",
    },
  };

  

  const history = useHistory();
  const avatarLink = useSelector((state) => state.profile.avatarUrl);
  const token = localStorage.getItem("token");
  const id = localStorage.getItem("localId");
  let url = "/profile/" + id;
  const isGuest = token === "guest";


  const publishClickHandler = () => {
    localStorage.removeItem("token");
    window.location.reload(true);
  };

  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  const profileNav = () => {
    history.push(url);
  };
  const open = Boolean(anchorEl);
  const id1 = open ? "simple-popover" : undefined;
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <header className={classes.header}>
      <div className={classes.topBar}>
        <div className={classes.topLeft}>
          <Link to="/welcome" aria-label="Go to home">
            <div className={classes.logos}></div>
          </Link>
        </div>

        <div className={classes.brand}>{NavbarTxt[lang].brand}</div>

        <nav className={classes.desktopNav} aria-label="Primary navigation desktop">
          {!token && (
            <NavLink to="/welcome" className={`${classes.tabItem} ${isActive("/welcome") ? classes.active : ""}`}>
              {NavbarTxt[lang].publish}
            </NavLink>
          )}
          {isGuest && (
            <button className={classes.tabItemButton} onClick={handleClick} type="button">
              {NavbarTxt[lang].publish}
            </button>
          )}
          {!isGuest && token && (
            <NavLink to="/submit" className={`${classes.tabItem} ${isActive("/submit") ? classes.active : ""}`}>
              {NavbarTxt[lang].publish}
            </NavLink>
          )}
          <NavLink to="/find" className={`${classes.tabItem} ${isActive("/find") ? classes.active : ""}`}>
            {NavbarTxt[lang].find}
          </NavLink>
          <NavLink to="/about" className={`${classes.tabItem} ${isActive("/about") ? classes.active : ""}`}>
            {NavbarTxt[lang].about}
          </NavLink>
        </nav>

        <div className={classes.topRight}>
          <div className={classes.langCompact}>
            <LanguageToggle />
          </div>
          <section className={classes.section}>
            <Dropdown style={{ zIndex: "1" }}>
              <Dropdown.Toggle
                id="dropdown-button-dark-example1"
                variant=""
                className={classes.avatarToggle}
              ></Dropdown.Toggle>

              <Dropdown.Menu variant="light">
                {!isGuest && (
                  <Dropdown.Item>
                    <Button onClick={profileNav} style={{ width: "100%" }}>
                      {NavbarTxt[lang].profile}
                    </Button>
                  </Dropdown.Item>
                )}
                <Dropdown.Item>{!token && <SignIn />}</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item> {token && <Logout />}</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Avatar src={avatarLink} />
          </section>
        </div>
      </div>

      <nav className={classes.tabBar} aria-label="Primary navigation">
        {!token && (
          <NavLink to="/welcome" className={`${classes.tabItem} ${isActive("/welcome") ? classes.active : ""}`}>
            {NavbarTxt[lang].publish}
          </NavLink>
        )}
        {isGuest && (
          <button className={classes.tabItemButton} onClick={handleClick} type="button">
            {NavbarTxt[lang].publish}
          </button>
        )}
        {!isGuest && token && (
          <NavLink to="/submit" className={`${classes.tabItem} ${isActive("/submit") ? classes.active : ""}`}>
            {NavbarTxt[lang].publish}
          </NavLink>
        )}
        <NavLink to="/find" className={`${classes.tabItem} ${isActive("/find") ? classes.active : ""}`}>
          {NavbarTxt[lang].find}
        </NavLink>
        <NavLink to="/about" className={`${classes.tabItem} ${isActive("/about") ? classes.active : ""}`}>
          {NavbarTxt[lang].about}
        </NavLink>
      </nav>

      <Popover
        id={id1}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Typography sx={{ p: 2 }}>
          <Button onClick={publishClickHandler}>{NavbarTxt[lang].logInToPublish}</Button>
        </Typography>
      </Popover>
    </header>
  );
};

export default NavbarBoot;
