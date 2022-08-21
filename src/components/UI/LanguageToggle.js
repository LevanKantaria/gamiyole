import './LanguageToggle.css'
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { langActions } from '../store';


const LanguageToggle = () => {
const dispatch = useDispatch();
  const [checked, setChecked] = useState(false);
  useEffect (()=>{
    if(!localStorage.getItem('Lang')){
      localStorage.setItem('Lang', 'EN')
    }
    console.log(localStorage.getItem('Lang'))
    let currentLanguage = localStorage.getItem('Lang')
    if(currentLanguage ==='GE'){
      setChecked(false) 
    }
    if(currentLanguage ==='EN'){
      setChecked(true)
    }
    dispatch(langActions.langToggle(localStorage.getItem('Lang')))
  },[])
 

  const languageToggleHandler = () =>{
  let currentLanguage = localStorage.getItem('Lang')

  if(currentLanguage === 'GE'){
    localStorage.setItem('Lang', 'EN')
    setChecked(true)
  }
  if(currentLanguage ==='EN'){
    localStorage.setItem('Lang' , 'GE')
    setChecked(false)

  }
  dispatch(langActions.langToggle(localStorage.getItem('Lang')))
  }


  return (
    
      <label className="switch">
        <input type="checkbox" onChange={languageToggleHandler}  checked={checked} />
        <span className="slider round"></span>
      </label>
   
  );
};

export default LanguageToggle;
