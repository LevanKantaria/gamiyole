import classes from "./Navbar.module.css"
import { useState } from "react";
import SignInModal from "./SignInModal";
import Button from 'react-bootstrap/Button';


const SignIn = (props) => {
 

const [showSignIn, setShowSignIn] = useState(false);

const showSignInHandler = (event) => {
    event.preventDefault();
    setShowSignIn(true);
    
}

const closeSignInHandler = () => {
    setShowSignIn(false);
};

    return <div>
              <Button onClick={showSignInHandler} variant="primary">Sign In</Button>{' '}

         <div className={classes.modal}>
        {showSignIn && <SignInModal  onClick={closeSignInHandler} />}

         </div>

    </div>

};

export default SignIn;