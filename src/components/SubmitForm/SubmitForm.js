import React, { useRef } from "react";
import { listAction } from "../store";
import { useDispatch, useSelector } from "react-redux";
import classes from "./SubmitForm.module.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useHistory } from "react-router-dom";
import { useEffect } from "react";
import { profileActions } from "../store";
import ListOptions from "../Options";
import EmailToSubscribers from "../EmalToSubscribers/EmailToSubscribers";

const SubmitForm = () => {
  const history = useHistory();
  const profileNumber = useSelector((state) => state.profile.number);
  const lang = useSelector((state) => state.lang.lang);
  const localId = useSelector((state) => state.auth.localId);
  const [numberIsValid, setNumberIsvalid] = useState(true);
  const [numIsTouched, setNumIsTouched] = useState(true);
  const [nameIsTouched, setNameIsTouched] = useState(false);
  const [dateIsTouched, setDateIsTouched] = useState(true);
  const [dateIsValid, setDateIsValid] = useState(true);
  const [dataSent, setDataSent] = useState(false);
  const profileName = useSelector((state) => state.profile.name);
  const [warning, setWarning] = useState("");
  const [departureWarning, setDepartureWarning] = useState("");
  const [destinationWarning, setDestinationWarning] = useState("");
  let id = localStorage.getItem("localId");
  const [destination, setDestination] = useState("");
  const [departure, setDeparture] = useState("");
  const [departureTimeWarning, setDepartureTimeWarning] = useState("");
  const [arrivalTimeWarning, setArrivalTimeWarning] = useState("");
  

  let SubmitTxt = {
    EN: {
      label:'Share your Ride',
      defaultDepart: "Leaving From . . .",
      defaultArrival: "Going To . . .",
      buttonTxt: "Find",
      findDriver: "Find Drivers",
      price:'price',
      seats:'seats',
      date:'date',
      departureTime:'Departure',
      arrivalTime:'Arrival',
      buttonTxt:'Publish',
    },

    GE: {
      label:'ახალი მარშრუტი',
      defaultDepart: "გამგზავრების ადგილი",
      defaultArrival: "მიმართულება . . . ",
      buttonTxt: "ძებნა",
      findDriver: "მოძებნე მძღოლი",
      price:'ფასი',
      seats:'ადგილები',
      date:'თარიღი',
      departureTime:'გასვლის დრო',
      arrivalTime:'ჩასვლის დრო',
      buttonTxt:'ატვირთვა',
    },
  };

  let profileUrl =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/profile/" +
    id +
    ".json";

  useEffect(() => {
    async function fetchData() {
      const response = await fetch(profileUrl);

      if (!response.ok) {
        throw new Error("No Fetching  fiuuuck");
      }
      let data = await response.json();

      console.log(data);
      if (data === null) {
        history.replace("/complete-profile");
        return;
      }
      if (data !== null) {
        dispatch(profileActions.newProfileHandler(data));
        console.log("data sent from submit Form Fetching");
      }

      return data;
    }
    fetchData().catch();
  }, [id, profileUrl]);

  useEffect(() => {
    console.log(profileName);
    console.log(localId);
  }, [profileName]);
  let submitLabel = "Publish";
  if (localId === "") {
    submitLabel = "Sign in to continue";
    //  history.replace('/welcome')
  }

  const numberUpdateHandler = (event) => {
    setNumIsTouched(true);
    if (event.target.value.length === 1 || event.target.value.length === 2) {
      setNumberIsvalid(true);
    }
    if (event.target.value.length === 0 || event.target.value.length > 2) {
      setNumberIsvalid(false);
    }
  };

  const dateChagneHandler = (event) => {
    setDateIsTouched(true);

    if (event.target.value.length) {
      setDateIsValid(true);
    }
  };

  const dispatch = useDispatch();
  const departureTimeRef = useRef();
  const arrivalTimeRef = useRef();
  const seatsRef = useRef();
  const priceRef = useRef();
  const dateRef = useRef();

  const submitHandler = (event) => {
    event.preventDefault();

    if (!destination || !departure) {
      setWarning("Please choose the City");

      if (!departure) {
        setDepartureWarning(classes.headshake);
      }
      if (!destination) {
        setDestinationWarning(classes.headshake);
      }

      setTimeout(() => {
        setDepartureWarning("");
        setDestinationWarning("");
      }, 400);
    }
    if (!departureTimeRef.current.value) {
      setDepartureTimeWarning(classes.headshakeLabel);
      setTimeout(() => {
        setDepartureTimeWarning("");
      }, 400);
    }

    if (!arrivalTimeRef.current.value) {
      setArrivalTimeWarning(classes.headshakeLabel);
      setTimeout(() => {
        setArrivalTimeWarning("");
      }, 400);
      return;
    }

    if (localId === "") {
      history.replace("/welcome");
      return (
        <div>
          <p>
            <Link to="/complete-profile"> Please Sing in first</Link>
          </p>
        </div>
      );
    }

    if (dateIsValid && numberIsValid) {
      

      console.log("valid");
      const newItem = {
        destination: destination.value,
        departure: departure.value,
        price: priceRef.current.value,
        seats: seatsRef.current.value,
        date: dateRef.current.value,
        number: profileNumber,
        name: profileName,
        localId: localId,
        departureTime: departureTimeRef.current.value,
        arrivalTime: arrivalTimeRef.current.value,
      };
      dispatch(listAction.addItem(newItem));
      console.log(newItem);

      const sendData = async () => {
        setDataSent(false);

        const response = await fetch(
          "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/list.json",
          {
            method: "POST",
            body: JSON.stringify(newItem),
          }
        );
        if (!response.ok) {
          throw new Error("something went wrong");
        }
      };
      sendData()
        .then(history.push("/welcome"))
        .catch((error) => console.log(error));
      setDataSent(true);
    } else {
      setNumIsTouched(true);
      setNameIsTouched(true);
      setDateIsTouched(true);
    }
  };

  return (
    <React.Fragment>
      <section className={classes.background}></section>
      <div className={classes.wrapper}>
        <h2>{SubmitTxt[lang].label}</h2>
        <section className={classes.placeholder}></section>
        {/* <section  className={warningClass} style={{color:'red', backgroundColor:'white'}}  >{warning}</section> */}
        {dataSent && (
          <section className={classes.success}> Data Sent successfully</section>
        )}

        <ListOptions
          id="departure"
          onChange={setDeparture}
          placeholder={SubmitTxt[lang].defaultDepart}
          className={departureWarning}
        />
        <section className={classes.placeholder}></section>
        <ListOptions
          id="destination"
          onChange={setDestination}
          placeholder={SubmitTxt[lang].defaultArrival}
          className={destinationWarning}
        />

        <section className={classes.placeholder}></section>
        <div className={classes.div1}>
          <label className={classes.label} htmlFor="price">
          {SubmitTxt[lang].price}:
          </label>
          <input ref={priceRef} type="number" id="price" placeholder="GEL" />

          <label htmlFor="nubmer">{SubmitTxt[lang].seats}:</label>
          <input
            className={`${numIsTouched && !numberIsValid && classes.red}`}
            ref={seatsRef}
            type="number"
            id="nubmer"
            defaultValue={3}
            onChange={numberUpdateHandler}
          />
        </div>
        <section className={classes.placeholder}></section>
        <section className={classes.labels}>
          <label htmlFor="date">{SubmitTxt[lang].date}</label>
        </section>
        <div className={classes.div2}>
          <input
            className={`${dateIsTouched && !dateIsValid && classes.red}`}
            ref={dateRef}
            type="date"
            id="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            onChange={dateChagneHandler}
          />
        </div>
        <section className={classes.timeLabels}>
          <label htmlFor="leavingTime">{SubmitTxt[lang].departureTime}</label>
          <label htmlFor="arrivalTime">{SubmitTxt[lang].arrivalTime}</label>
        </section>
        <div className={classes.divTime}>
          <input
            id="leavingTime"
            type="time"
            ref={departureTimeRef}
            className={departureTimeWarning}
          />
          <input
            id="arrivalTime"
            type="time"
            ref={arrivalTimeRef}
            className={arrivalTimeWarning}
          />
        </div>
        <br></br>

        <button className={classes.button} onClick={submitHandler}>
        {SubmitTxt[lang].buttonTxt}
        </button>
      </div>
    </React.Fragment>
  );
};

export default SubmitForm;
