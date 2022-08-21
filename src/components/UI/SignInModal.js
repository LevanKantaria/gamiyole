import classes from "./Sign.module.css";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { authAction } from "../store";
import { profileActions } from "../store";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import Button from "react-bootstrap/Button";
import jwt_decode from "jwt-decode";
import axios from "axios";

function SignInModal(props) {
  const token = useSelector((state) => state.auth.token);
  const localId = useSelector((state) => state.auth.localId);
  const email = useSelector((state) => state.auth.email);
  const password = useSelector((state) => state.auth.password);
  const [errorTxt, setErrorTxt] = useState("");

  const [emailState, setEmailState] = useState();
  const [passwordState, setPasswordState] = useState();
  const [emailWarning, setEmailWarining] = useState("");
  const [passwordWarning, setPasswordWarning] = useState("");

  let googleInfoUrl = 'https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/google/' + localId +'.json'
  useEffect(() => {
    setEmailState(email);
    setPasswordState(password);
  }, []);

  const passwordchangeHandler = (event) => {
    setPasswordState(event.target.value);
  };

  const emaliChangeHandler = (event) => {
    setEmailState(event.target.value);
  };

  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef();
  const passwordRef = useRef();

  if (email) {
    console.log(email);
  }

  const submitHandler = (event) => {
    event.preventDefault();
    const enteredEmail = emailRef.current.value;
    const enteredPassword = passwordRef.current.value;

    if (enteredEmail === "") {
      setEmailWarining(classes.headshake);
      setTimeout(() => {
        setEmailWarining(classes.select);
      }, 400);
    }
    if (enteredPassword === "") {
      setPasswordWarning(classes.headshake);
      setTimeout(() => {
        setPasswordWarning(classes.select);
      }, 400);
    }

    let errorMessage = "error";
    fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCGf3VaQgcpgxlTeLvWpXJZmCvwqX4FdkU",
      {
        method: "POST",
        body: JSON.stringify({
          email: enteredEmail,
          password: enteredPassword,
          returnSecureToken: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((res) => {
        setIsLoading(false);
        if (res.ok) {
          return res.json();
        } else {
          return res.json().then((data) => {
            if (data && data.error && data.error.message) {
              errorMessage = data.error.message;
              console.log(errorMessage);
              setErrorTxt(errorMessage);
              if (errorMessage === "INVALID_PASSWORD") {
                setErrorTxt("Wrong password");
                setPasswordWarning(classes.headshake);
                setTimeout(() => {
                  setPasswordWarning(classes.select);
                }, 400);
              }
              if (errorMessage === "EMAIL_NOT_FOUND") {
                setErrorTxt("Email Not Registered");
                setEmailWarining(classes.headshake);
                setTimeout(() => {
                  setEmailWarining(classes.select);
                }, 400);
              }
              if (errorMessage === "MISSING_PASSWORD") {
                setErrorTxt("Enter Password");
              }
            }
            throw new Error(errorMessage);
          });
        }
      })
      .then((data) => {
        // Store Token in Redux
        dispatch(authAction.logInHandler(data));
        console.log(data);
        console.log("ds");
      })
      .catch((err) => {});
  };
  const close = () => {
    dispatch(authAction.logInGuestHandler());
  };

  const handleCallbackResponse = (response) => {
    let userObject = jwt_decode(response.credential);
    console.log(userObject);

    dispatch(authAction.logInHandlerGoogle(userObject));
    dispatch(profileActions.googleEmailHandler(userObject.email))
    fetch(
      'https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/google/' + userObject.sub +'.json',
      {
        method: "PUT",
        body: JSON.stringify({
          email: userObject.email,
          name: userObject.name,          
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => {
      console.log(res)

      console.log('Updated Google Profile')
    })
  };



  useEffect(() => {
    /* global google */

    setTimeout(() => {
      google.accounts.id.initialize({
        client_id:
          "815543720297-lqokeoeah1a64ntdm88mju1gj8eq7g29.apps.googleusercontent.com",
        callback: handleCallbackResponse,
        headers: {
          "Content-Type": "application/json",
        },
      });
      google.accounts.id.renderButton(document.getElementById("signInDiv"), {
        
        'scope': 'profile email',
        'width': 240,
        'height': 50,
        'longtitle': true,
        'theme': 'dark',
        
      });
      google.accounts.id.prompt();
    }, 300);
  }, []);

  return (
    <div className={classes.overlay}>
      <form className={classes.modal}>
        <div className={classes.content}>
        <Button
          className={classes.close}
              type="button"
              onClick={close}
              style={{ backgroundColor: 'rgba(128, 128, 128, 0.356)', width: "30px", height: "30px" }}
            >
              X
            </Button>
          <h1> Sign In</h1>

          <h3>{errorTxt}</h3>
          <div>
            <input
              className={emailWarning}
              onChange={emaliChangeHandler}
              value={emailState}
              type="email"
              id="email"
              placeholder="Your Email"
              required
              ref={emailRef}
            />
          </div>
          <div>
            <input
              className={passwordWarning}
              onChange={passwordchangeHandler}
              value={passwordState}
              type="password"
              id="password"
              placeholder="Your Password"
              required
              ref={passwordRef}
            />
          </div>
          <section className={classes.box}>
            <Button
              className={classes.button}
              type="button"
              onClick={submitHandler}
            >
              Sign In
            </Button>
            <div className={classes.google}>
              <section></section>
              <div id="signInDiv" >
                {" "}
              </div>
              <section></section>
            </div>
           
          </section>
          <hr></hr>
          <section>
            Not a member? : <Link to="signup"> Sign Up</Link>
          </section>
          
        </div>
      </form>
    </div>
  );
}

export default SignInModal;
