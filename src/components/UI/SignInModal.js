import classes from "./Sign.module.css";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { authAction } from "../store";
import { profileActions } from "../store";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import Button from "react-bootstrap/Button";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../../firebase/client";

function SignInModal(props) {
  const email = useSelector((state) => state.auth.email);
  const password = useSelector((state) => state.auth.password);
  const [errorTxt, setErrorTxt] = useState("");

  const [emailState, setEmailState] = useState();
  const [passwordState, setPasswordState] = useState();
  const [emailWarning, setEmailWarining] = useState("");
  const [passwordWarning, setPasswordWarning] = useState("");

  useEffect(() => {
    setEmailState(email);
    setPasswordState(password);
  }, [email, password]);

  const passwordchangeHandler = (event) => {
    setPasswordState(event.target.value);
  };

  const emaliChangeHandler = (event) => {
    setEmailState(event.target.value);
  };

  const dispatch = useDispatch();
  const emailRef = useRef();
  const passwordRef = useRef();

  if (email) {
    console.log(email);
  }

  const submitHandler = async (event) => {
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

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        enteredEmail,
        enteredPassword
      );
      const idToken = await userCredential.user.getIdToken();
      dispatch(
        authAction.logInHandler({
          idToken,
          localId: userCredential.user.uid,
        })
      );
      setErrorTxt("");
    } catch (err) {
      const message = err?.code || err?.message || "SIGN_IN_FAILED";
      if (message.includes("wrong-password") || message.includes("invalid-credential")) {
        setErrorTxt("Wrong password");
      } else if (message.includes("user-not-found")) {
        setErrorTxt("Email Not Registered");
        setEmailWarining(classes.headshake);
        setTimeout(() => {
          setEmailWarining(classes.select);
        }, 400);
      } else if (message.includes("invalid-email")) {
        setErrorTxt("Invalid Email");
      } else {
        setErrorTxt("Sign in failed");
      }
    }
  };
  const close = () => {
    dispatch(authAction.logInGuestHandler());
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      const { user } = userCredential;
      dispatch(
        authAction.logInHandler({
          idToken,
          localId: user.uid,
        })
      );
      dispatch(profileActions.googleEmailHandler(user.email || ""));

      fetch(
        'https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/google/' + user.uid +'.json',
        {
          method: "PUT",
          body: JSON.stringify({
            email: user.email,
            name: user.displayName || "",          
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => {
        console.log(res);
        console.log("Updated Google Profile");
      });
    } catch (error) {
      console.log(error);
      const message = error?.code || error?.message || "GOOGLE_SIGN_IN_FAILED";
      setErrorTxt(`Google sign in failed: ${message}`);
    }
  };
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
              <Button type="button" variant="light" onClick={handleGoogleSignIn}>
                Continue with Google
              </Button>
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
