import classes from "./Navbar.module.css";
import { Link } from "react-router-dom";
import SignIn from "./SignIn";
import { useSelector, useDispatch } from "react-redux";
import Logout from "./Logout";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import Avatar from "@mui/material/Avatar";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { useNavigate } from "react-router";
import { useHistory } from "react-router-dom";
import { authAction } from "../store";
import LanguageToggle from "./LanguageToggle";

const NavbarBoot = (props) => {
  const lang = useSelector((state) => state.lang.lang);
  let NavbarTxt = {
    EN: {
      publish:'Publish',
      find: "Find",
      logInToPublish:'Log In to Publish',
      profile:'Profile'
      
    },

    GE: {
      publish:'ატვირთე',
      find: "მოძებნე",
      logInToPublish: 'ასატვირთად გაიარე ავტორიზაცია',
      profile:'პროფილი',
    },
  };

  

  const history = useHistory();
  const dispatch = useDispatch();
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
  return (
    <header className={classes.header}>
      <nav>
        <ul>
          <li>
            <Link to="/welcome">
              <div className={classes.logos}></div>
            </Link>
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
          </li>
          <li>
            {!token && <Link to="/welcome">{NavbarTxt[lang].publish}</Link>}
            {isGuest && (
              <Link to="/welcome" onClick={handleClick}>
                {NavbarTxt[lang].publish}
              </Link>
            )}

            {!isGuest && token && <Link to="/submit">{NavbarTxt[lang].publish}</Link>}
          </li>

          <li>
            <Link to="/find"> {NavbarTxt[lang].find}</Link>
          </li>

          <li>
            <section className={classes.section}>
              <Dropdown style={{ zIndex: "1" }}>
                <Dropdown.Toggle
                  id="dropdown-button-dark-example1"
                  variant=""
                  style={{
                    border: "none",
                    position: "relative",
                    zIndex: "100",
                    color: "transparent",
                    left: "40px",
                  }}
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
          </li>
          
          <section>
              <LanguageToggle />
            </section>
          
        </ul>
      </nav>
    </header>
  );
};

export default NavbarBoot;
