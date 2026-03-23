import React from "react";
import { listAction } from "../store";
import { useDispatch, useSelector } from "react-redux";
import classes from "./SubmitForm.module.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useHistory } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { profileActions } from "../store";
import ListOptions from "../Options";

const SubmitForm = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const profileNumber = useSelector((state) => state.profile.number);
  const lang = useSelector((state) => state.lang.lang);
  const localId = useSelector((state) => state.auth.localId);
  const [numberIsValid, setNumberIsvalid] = useState(true);
  const [numIsTouched, setNumIsTouched] = useState(true);
  const [dateIsTouched, setDateIsTouched] = useState(true);
  const [dateIsValid, setDateIsValid] = useState(true);
  const [dataSent, setDataSent] = useState(false);
  const profileName = useSelector((state) => state.profile.name);
  const [departureWarning, setDepartureWarning] = useState("");
  const [destinationWarning, setDestinationWarning] = useState("");
  let id = localStorage.getItem("localId");
  const token = localStorage.getItem("token");
  const authQuery = token && token !== "guest" ? `?auth=${token}` : "";
  const [destination, setDestination] = useState(null);
  const [departure, setDeparture] = useState(null);
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState(3);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editRouteId, setEditRouteId] = useState("");
  const [departureTimeWarning, setDepartureTimeWarning] = useState("");
  const [arrivalTimeWarning, setArrivalTimeWarning] = useState("");
  

  let SubmitTxt = {
    EN: {
      label:'Share your Ride',
      defaultDepart: "Leaving From . . .",
      defaultArrival: "Going To . . .",
      findDriver: "Find Drivers",
      price:'price',
      seats:'seats',
      date:'date',
      departureTime:'Departure',
      arrivalTime:'Arrival',
      buttonTxt:'Publish',
      buttonUpdate: "Update route",
    },

    GE: {
      label:'ახალი მარშრუტი',
      defaultDepart: "გამგზავრების ადგილი",
      defaultArrival: "მიმართულება . . . ",
      findDriver: "მოძებნე მძღოლი",
      price:'ფასი',
      seats:'ადგილები',
      date:'თარიღი',
      departureTime:'გასვლის დრო',
      arrivalTime:'ჩასვლის დრო',
      buttonTxt:'ატვირთვა',
      buttonUpdate: "განახლება",
    },
  };

  let profileUrl =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/profile/" +
    id +
    ".json" +
    authQuery;

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
  }, [dispatch, history, profileUrl]);

  const numberUpdateHandler = (event) => {
    setSeats(event.target.value);
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

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const editId = query.get("edit");
    if (!editId) {
      setIsEditMode(false);
      setEditRouteId("");
      return;
    }
    setIsEditMode(true);
    setEditRouteId(editId);

    const routeUrl =
      "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/list/" +
      editId +
      ".json" +
      authQuery;

    fetch(routeUrl)
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        setDeparture(data.departure ? { value: data.departure, label: data.departure } : null);
        setDestination(data.destination ? { value: data.destination, label: data.destination } : null);
        setPrice(data.price || "");
        setSeats(data.seats || 3);
        setDate(data.date || new Date().toISOString().slice(0, 10));
        setDepartureTime(data.departureTime || "");
        setArrivalTime(data.arrivalTime || "");
      })
      .catch(() => {});
  }, [location.search, authQuery]);

  const submitHandler = (event) => {
    event.preventDefault();

    if (!destination || !departure) {
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
    if (!departureTime) {
      setDepartureTimeWarning(classes.headshakeLabel);
      setTimeout(() => {
        setDepartureTimeWarning("");
      }, 400);
    }

    if (!arrivalTime) {
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
        price,
        seats,
        date,
        number: profileNumber,
        name: profileName,
        localId: localId,
        departureTime,
        arrivalTime,
      };
      if (!isEditMode) {
        dispatch(listAction.addItem(newItem));
      }
      console.log(newItem);

      const sendData = async () => {
        setDataSent(false);

        const url = isEditMode
          ? "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/list/" +
            editRouteId +
            ".json" +
            authQuery
          : "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/list.json" +
            authQuery;

        const response = await fetch(
          url,
          {
            method: isEditMode ? "PUT" : "POST",
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
          value={departure}
          placeholder={SubmitTxt[lang].defaultDepart}
          className={departureWarning}
        />
        <section className={classes.placeholder}></section>
        <ListOptions
          id="destination"
          onChange={setDestination}
          value={destination}
          placeholder={SubmitTxt[lang].defaultArrival}
          className={destinationWarning}
        />

        <section className={classes.placeholder}></section>
        <div className={classes.div1}>
          <label className={classes.label} htmlFor="price">
          {SubmitTxt[lang].price}:
          </label>
          <input
            type="number"
            id="price"
            placeholder="GEL"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <label htmlFor="nubmer">{SubmitTxt[lang].seats}:</label>
          <input
            className={`${numIsTouched && !numberIsValid && classes.red}`}
            type="number"
            id="nubmer"
            value={seats}
            min={1}
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
            type="date"
            id="date"
            value={date}
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
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className={departureTimeWarning}
          />
          <input
            id="arrivalTime"
            type="time"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            className={arrivalTimeWarning}
          />
        </div>
        <br></br>

        <button className={classes.button} onClick={submitHandler}>
        {isEditMode ? SubmitTxt[lang].buttonUpdate : SubmitTxt[lang].buttonTxt}
        </button>
      </div>
    </React.Fragment>
  );
};

export default SubmitForm;
