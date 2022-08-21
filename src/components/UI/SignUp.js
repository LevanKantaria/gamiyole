import classes from "./Navbar.module.css"
import { useState } from "react";
import SignUpModal from "./SignUpModal";
import { useRef } from "react";


const SignUp = (props) => {
    
const [showSignUp, setShowSignUp] = useState(false);

const showSignUpHandler = (event) => {
    event.preventDefault();
    setShowSignUp(true);
    console.log(showSignUp);
}

const closeSignUpHandler = () => {
    setShowSignUp(false);
};

    return <div>
         <button onClick={showSignUpHandler} className={classes.button} type="button">Sign Up</button>
         <div className={classes.modal}>

        {showSignUp && <SignUpModal onClick={closeSignUpHandler} />}
         </div>

    </div>

};

export default SignUp;