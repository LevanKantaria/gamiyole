import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import ListItem from "./ListItem";
import classes from "./ListItem.module.css";
import Button from "react-bootstrap/Button";
import axios from "axios";
import { list } from "firebase/storage";
import Tooltip from "react-bootstrap/Tooltip";
import Overlay from "react-bootstrap/Overlay";

let array = [];
const List = () => {
  const lang = useSelector((state) => state.lang.lang);
  const [show, setShow] = useState(false);
  const target = useRef(null);

  let listTxt = {
    EN: {
      selectCities: "Select cities",
      noDrivers: "No Drivers found :(",
      notify: "Notify Me when Someone Publishes a ride for Route:",
      subscribe: "Subscribe",
      comingSoog: "This Feature will be added Soon!",
    },

    GE: {
      selectCities: "აირჩიე ქალაქი",
      noDrivers: "მძღოლი ვერ მოიძებნა:(",
      notify: "შემატყობინე როცა გამოჩნდება მძღოლი ამ რეისზე:",
      subscribe: "გამოწერა",
      comingSoog: "ფუნქცია მალე დაემატება",
    },
  };
  const clickTracker = useSelector((state) => state.list.clicks);
  const items = useSelector((state) => state.list.items);

  const filterItem = useSelector((state) => state.list.filter);

  const [classState, setClassState] = useState(classes.animated);

  const subSubcriptionFolder =
    filterItem.departure + "-" + filterItem.destination;
  let subscriptionUrl =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/subscriptions/" +
    subSubcriptionFolder +
    "/" +
    localStorage.getItem("localId") +
    ".json";

  useEffect(() => {
    const subscriptionList = () => {
      axios.get(subscriptionUrl).then((res) => {
        console.log(res.data);
      });
    };

    subscriptionList();
  }, []);

  const subscribeHandler = () => {
    setShow(!show);
    axios
      .put(subscriptionUrl, {
        mail: localStorage.getItem("email"),
        user: localStorage.getItem("localId"),
        from: filterItem.departure,
        to: filterItem.destination,
      })
      .then((res) => {
        console.log(res);
      });
  };

  useEffect(() => {
    if (listItems.length === 0) {
      setClassState(classes.animated);
      let timer = setTimeout(() => {
        setClassState("");
      }, 1000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [clickTracker]);

  array = [];
  for (const key in items) {
    if (items[key].name !== undefined) {
      array.push({
        id: items[key].id,
        name: items[key].name,
        destination: items[key].destination,
        departure: items[key].departure,
        number: items[key].number,
        date: items[key].date,
        localId: items[key].localId,
        seats: items[key].seats,
        price: items[key].price,
        departureTime: items[key].departureTime,
        arrivalTime: items[key].arrivalTime,
      });
    }
  }
  console.log(array);

  let filteredArray = array.filter(
    (item) =>
      item.destination === filterItem.destination &&
      item.departure === filterItem.departure &&
      item.date === filterItem.date
  );

  const listItems = filteredArray
    .reverse()
    .map((item) => (
      <ListItem
        id={item.id}
        key={Math.random()}
        destination={item.destination}
        departure={item.departure}
        name={item.name}
        number={item.number}
        date={item.date}
        localId={item.localId}
        price={item.price}
        seats={item.seats}
        arrivalTime={item.arrivalTime}
        departureTime={item.departureTime}
      />
    ));

  if (listItems.length === 0 && clickTracker !== 0) {
    if (filterItem.departure === "Leavning From...") {
      return (
        <div className={classState}>
          {" "}
          <br></br>
          <p> {listTxt[lang].selectCities}</p>
        </div>
      );
    }
    return (
      <>
        <div className={classState}>
          {" "}
          <br></br>
          {classState !== "" && <p> {listTxt[lang].noDrivers}</p>}
        </div>
        <div className={classes.greyDiv}>
          <p>
            {" "}
            {listTxt[lang].notify} <br></br> {filterItem.departure}-{" "}
            {filterItem.destination}{" "}
          </p>

          <Button variant="secondary"  ref={target} onClick={subscribeHandler}>
            {listTxt[lang].subscribe}
          </Button>
          <Overlay target={target.current} show={show} placement="right">
            {(props) => (
              <Tooltip id="overlay-example" {...props}>
                {listTxt[lang].comingSoog}
              </Tooltip>
            )}
          </Overlay>
        </div>
      </>
    );
  }
  return <div> {listItems}</div>;
};

export const listOfItems = array;
export default List;
