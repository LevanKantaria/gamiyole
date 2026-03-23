import classes from "./Sign.module.css";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { authAction } from "../store";
import { useHistory } from "react-router-dom";
import Button from "react-bootstrap/Button";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/client";

function SignUpModal(props) {
  const history = useHistory();
  const dispatch = useDispatch();

  const emailRef = useRef();
  const passwordRef = useRef();
  const confirmPasswordRef = useRef();
  const [password, setPassword] = useState("");
  const [passwordIsTouched, setPasswordIsTouched] = useState(false);
  const [confirmPassord, setConfirmPassword] = useState("");
  const [confirmIsTouched, setConfirmIsTouched] = useState(false);

  const passwordChangeHandler = (event) => {
    setPassword(event.target.value);
    setPasswordIsTouched(true);
  };

  const confirmChangeHandler = (event) => {
    setConfirmPassword(event.target.value);
    setConfirmIsTouched(true);
  };

  const passwordMatch = password === confirmPassord;
  const weakPassword = password.length <6;

  const [errorTxt, setErrorTxt] = useState("");
  const close = () => {
    dispatch(authAction.logInGuestHandler());
  };

  const submitHandler = async (event) => {
    event.preventDefault();

    const enteredEmail = emailRef.current.value;
    const enteredPassword = passwordRef.current.value;
    const confirmPassword = confirmPasswordRef.current.value;
    if (enteredPassword !== confirmPassword) {
      setErrorTxt("Passwords do not match!");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        enteredEmail,
        enteredPassword
      );
      const idToken = await userCredential.user.getIdToken();
      const data = {
        idToken,
        localId: userCredential.user.uid,
        email: enteredEmail,
        password: enteredPassword,
      };
      dispatch(authAction.signUpHandler(data));
      dispatch(authAction.logInHandler(data));
      history.push("/welcome");
    } catch (err) {
      const message = err?.code || err?.message || "SIGN_UP_FAILED";
      if (message.includes("email-already-in-use")) {
        setErrorTxt("Email already exists");
      } else if (message.includes("weak-password")) {
        setErrorTxt("Password must be at least 6 characters");
      } else if (message.includes("invalid-email")) {
        setErrorTxt("Invalid email");
      } else {
        setErrorTxt("Sign up failed");
      }
    }
  };
  return (
    <form className={classes.modal}>
      <div className={classes.content}>
        <h1> Sign Up</h1>
        <h3 style={{ color: "rgba(236, 0, 0, 0.75)" }}>{errorTxt}</h3>
        <div>
          <input
            type="email"
            id="email"
            placeholder="Your Email"
            required
            ref={emailRef}
          />
        </div>
        <div>
          <input
            style={{backgroundColor: weakPassword && passwordIsTouched && "rgb(236, 164, 164)"}}
            type="password"
            id="password"
            placeholder="Your Password"
            required
            ref={passwordRef}
            onChange={passwordChangeHandler}
          />
          <input
            style={{ backgroundColor: !passwordMatch &&confirmIsTouched && "rgb(236, 164, 164)" }}
            ref={confirmPasswordRef}
            type="password"
            id="confirmPassword"
            placeholder="Confirm Password"
            onChange={confirmChangeHandler}
          />
        </div>
        <Button type="button" onClick={submitHandler}>
          Sign Up
        </Button>

        <Button
          type="button"
          onClick={close}
          style={{ backgroundColor: "grey" }}
        >
          Continue as a Guest
        </Button>

        <section className={classes.bottom}>

        <Link to="/welcome">Already have an account? </Link>
        </section>
      </div>
    </form>
  );
}

export default SignUpModal;
