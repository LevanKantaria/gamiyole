import classes from "./Sign.module.css";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { authAction } from "../store";
import { useHistory } from "react-router-dom";
import Button from "react-bootstrap/Button";

function SignUpModal(props) {
  const history = useHistory();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const emailRef = useRef();
  const passwordRef = useRef();
  const confirmPasswordRef = useRef();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordIsTouched, setPasswordIsTouched] = useState(false);
  const [confirmPassord, setConfirmPassword] = useState("");
  const [confirmIsTouched, setConfirmIsTouched] = useState(false);

  const emailChangeHandler = (event) => {
    setPassword(event.target.value);
  };

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

  const submitHandler = (event) => {
    event.preventDefault();

    const enteredEmail = emailRef.current.value;
    const enteredPassword = passwordRef.current.value;
    const confirmPassword = confirmPasswordRef.current.value;
    if (enteredPassword !== confirmPassword) {
      setErrorTxt = 'Passwords do not match!'
    }
    setIsLoading(true);

    fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyCGf3VaQgcpgxlTeLvWpXJZmCvwqX4FdkU",
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
            let errorMessage = "error";
            if (data && data.error && data.error.message) {
              errorMessage = data.error.message;
              console.log(errorMessage);
              setErrorTxt(errorMessage);
              if(errorMessage==='EMAIL_EXISTS'){
                setErrorTxt('Email already exists')
              }
              if(errorMessage ==='MISSING_PASSWORD'){
                setErrorTxt('Enter Password')
              }
            }
            
            throw new Error(errorMessage);
          });
        }
      })
      .then((data) => {
        console.log(data);
        let pw = { email: enteredEmail, password: enteredPassword };
        dispatch(authAction.signUpHandler(data));
        dispatch(authAction.logInHandler(data));
        history.push("/welcome");
      })
      .catch((err) => {
       
      });
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
            onChange={emailChangeHandler}
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
