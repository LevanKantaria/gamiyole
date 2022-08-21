import { useState,  } from "react";
import Card from "../Card/Card";
import { useSelector } from "react-redux";
import classes from './Intro.module.css';


const Intro = () => {

    
    const lang = useSelector(state=> state.lang.lang)

    let introTxt= {
        EN: {welcomeTxt: 'Travelling was meant to be Fun'},
        GE: {welcomeTxt: 'გახადე მგზავრობა სახალისო'},
    }
    console.log(introTxt)
    console.log(typeof(lang))
    return (
        <div className={classes.maindiv}>

        <Card>
            <p>{introTxt[lang].welcomeTxt}

                 </p>
        </Card>
                
                 

      
        </div>
    )

};

export default Intro;