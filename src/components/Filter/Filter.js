import classes from "./Filter.module.css";
import { useRef, useState, useLayoutEffect } from "react";
import { listAction } from "../store";
import { useDispatch } from "react-redux";
import ListOptions from "../Options";
import { useSelector } from "react-redux";

const Filter = () => {
  const lang = useSelector(state=> state.lang.lang)

  let FilterTxt = {
    EN:{defaultDepart: 'Leaving From . . .' , defaultArrival: 'Going To . . .', buttonTxt:'Find', findDriver:'Find Drivers'},
    GE:{defaultDepart: 'გამგზავრება . . . ',defaultArrival: 'მიმართულება . . . ',buttonTxt:'ძებნა', findDriver : 'მოძებნე მძღოლი'}
  }

  
  const dispatch = useDispatch();
  let filteredArray = [];
  const [destination, setDestination] = useState("");
  const [departure, setDeparture] = useState("");
  const [width, setWidth] = useState(window.innerWidth);
  const [size, setSize] = useState([0, 0]);
  function useWindowSize() {
    useLayoutEffect(() => {
      function updateSize() {
        setSize([window.innerWidth, window.innerHeight]);
      }
      window.addEventListener("resize", updateSize);
      updateSize();
      return () => window.removeEventListener("resize", updateSize);
    }, []);
  }
  useWindowSize();

  const destinationRef = useRef();
  const departureRef = useRef();
  const daterRef = useRef();
  const [departureWarning, setDepartureWarning] = useState("");
  const [destinationWarning, setDestinationWarning] = useState("");

  const submitHandler = (event) => {
    console.log(departure.value);
    console.log(destination.value);
    event.preventDefault();

    const date = daterRef.current.value;

    dispatch(
      listAction.updateFilterList({
        destination: destination.value,
        departure: departure.value,
        date: date,
      })
    );
    if (destination && departure) {
      console.log(destination);
      dispatch(listAction.clickTracker());
    } else {
      if (!destination) {
        setDestinationWarning(classes.headshake);
        setTimeout(() => {
          setDestinationWarning(classes.select);
        }, 400);
      }
      if (!departure) {
        setDepartureWarning(classes.headshake);
        setTimeout(() => {
          setDepartureWarning(classes.select);
        }, 400);
      }
    }
  };
  if (size[0] < 768) {
    return (
      <>
        <h2>{FilterTxt[lang].findDriver}</h2>
        <div className={classes.wrapper}>
          <section className={classes.placeholder}></section>
          <section className={classes.list}>
            <ListOptions
              id="departure"
              onChange={setDeparture}
              placeholder={FilterTxt[lang].defaultDepart}
              className={departureWarning}
            />
          </section>
          <section className={classes.placeholder}></section>
          <section className={classes.list}>
            <ListOptions
              id="destination"
              onChange={setDestination}
              placeholder={FilterTxt[lang].defaultArrival}
              className={destinationWarning}
            />
          </section>
          <section className={classes.placeholder}></section>
          <div>
            <label htmlFor="date"></label>
            <input
              className={classes.date}
              style={{ width: "50%", margin: "auto" }}
              ref={daterRef}
              type="date"
              id="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <section className={classes.placeholder}></section>

          <button className={classes.button} onClick={submitHandler}>
            {FilterTxt[lang].buttonTxt}
          </button>
        </div>
      </>
    );
  }
  if (size[0] > 768) {
    return (
      <>
        <div className={classes.wrapper}>
          <section className={classes.list}>
            <ListOptions
              id="departure"
              onChange={setDeparture}
              placeholder={FilterTxt[lang].defaultDepart}
              className={departureWarning}
            />
          </section>

          <section className={classes.list}>
            <ListOptions
              id="destination"
              onChange={setDestination}
              placeholder={FilterTxt[lang].defaultArrival}
              className={destinationWarning}
            />
          </section>

          <section>
            <input
              className={classes.date}
              ref={daterRef}
              type="date"
              id="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </section>
          <button className={classes.button1} onClick={submitHandler}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              className="bi bi-search"
              viewBox="0 0 16 16"
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
          </button>
        </div>
      </>
    );
  }
};

export default Filter;
