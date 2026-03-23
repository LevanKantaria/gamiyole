import { useDispatch } from "react-redux";
import { authAction } from "../store";
import { useSelector } from "react-redux";
import Button from 'react-bootstrap/Button';
import React from "react";
import { useHistory } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/client";



const Logout = () => {
    const lang = useSelector((state) => state.lang.lang);
    let logoutTxt ={
        EN: {
          loguot:'Logout',
          signIn: "Sign In",
          
          
          
        },
    
        GE: {
            loguot:'გასვლა',
            signIn: "ავტორიზაცია",
       
        },
    }

    const history = useHistory();
   // const token = useSelector((state) => state.auth.token);
   const token = localStorage.getItem('token');
    let Logout = logoutTxt[lang].loguot;
    if(token ==='guest'){
        Logout = logoutTxt[lang].signIn
    }

    const dispatch = useDispatch();
    const clickHandler = async (event) => {
        event.preventDefault();        

        if (token && token !== "guest") {
          try {
            await signOut(auth);
          } catch (error) {
            console.log(error);
          }
        }
        dispatch(authAction.logoutHandler());
        history.replace('/welcome');
    };
   
    return <div>
      <Button onClick={clickHandler} variant="secondary" style={{width: '100%'}}>  {Logout}</Button>
      


    </div>
};

export default Logout; 