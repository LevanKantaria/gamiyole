import classes from "./ListItem.module.css";
import { Link } from "react-router-dom";
import axios from "axios";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { listAction } from "../store";
import Avatar from "@mui/material/Avatar";
import { useSelector } from "react-redux";

const ListItem = (props) => {
  const lang = useSelector((state) => state.lang.lang);
  const token = localStorage.getItem("token");
  const authQuery = token && token !== "guest" ? `?auth=${token}` : "";

  let days=[]
  let months=[]
  if(lang ==="EN"){

    days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
  }
  if(lang ==="GE"){

    days = [
      "კვირა",
      "ორშაბათი",
      "სამშაბათი",
      "ოთხშაბათი",
      "ხუთშაბათი",
      "პარასკევი",
      "შაბათი",
    ];
    months = [
      "იანვარი",
      "თებერვალი",
      "მარტი",
      "აპრილი",
      "მაისი",
      "ივნისი",
      "ივლისი",
      "აგვისტო",
      "სექტემბერი",
      "ოქტომბერი",
      "ნოემბერი",
      "დეკქმბერი",
    ];
  }
    var now = new Date(props.date);
  let newDate =
    days[now.getDay()] + " " + months[now.getMonth()] + " " + now.getDate();
    if(lang ==='GE'){
      newDate =days[now.getDay()] +  ",  " + now.getDate() +  " " + months[now.getMonth()];
    }
  let localId = "/profile/" + props.localId;
  const myProfile = localStorage.getItem("localId") === props.localId;
  const [avatarUrl, setAvatarUrl] = useState("");

  const [classState, setClassState] = useState("");
  const dispatch = useDispatch();

  useEffect(() => {
    axios(
      "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/pictures/profile/" +
        props.localId +
        ".json" +
        authQuery
    ).then((res) => {
      setAvatarUrl(res.data);
      console.log(res.data);
    });
  }, [props.localId, authQuery]);

  const deleteHandler = () => {
    async function fetchData() {
      const response = await fetch(
        "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/list.json" +
          authQuery
      );

      if (!response.ok) {
        throw new Error("No Fetching  fiuuuck");
      }
      let data = await response.json();
      if (!data) {
        dispatch(listAction.loadData([]));
        return;
      }

      console.log(data);

      let array = [{}];
      for (const key in data) {
        if (data[key].name !== undefined) {
          array.push({
            id: key,
            name: data[key].name,
            destination: data[key].destination,
            departure: data[key].departure,
            number: data[key].number,
            date: data[key].date,
            price: data[key].price,
            seats: data[key].seats,
            localId: data[key].localId,
            departureTime: data[key].departureTime,
            arrivalTime: data[key].arrivalTime,
          });
        }
      }
      dispatch(listAction.loadData(array));

      return data;
    }

    axios
      .delete(
        "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/list/" +
          props.id +
          ".json" +
          authQuery
      )
      .then(setClassState(classes.remove))
      .then(
        setTimeout(() => {
          fetchData();
        }, 800)
      );
  };

  return (
    <div className={classState}>
      <div className={classes.main}>
        <div className={classes.header}>
          <span className={classes.date}>{newDate}</span>
          <div className={classes.headerMeta}>
            <span className={classes.seatsBadge}>{props.seats} seats</span>
            <span className={classes.price}>{props.price} GEL</span>
          </div>
        </div>

        <div className={classes.routeBody}>
          <div className={classes.timeline}>
            <span className={classes.dot}></span>
            <span className={classes.line}></span>
            <span className={classes.dot}></span>
          </div>
          <div className={classes.routeInfo}>
            <div className={classes.routeRow}>
              <span className={classes.time}>{props.departureTime}</span>
              <span className={classes.city}>{props.departure}</span>
            </div>
            <div className={classes.routeRow}>
              <span className={classes.time}>{props.arrivalTime}</span>
              <span className={classes.city}>{props.destination}</span>
            </div>
          </div>
        </div>

        <div className={classes.footer}>
          <Link className={classes.driver} to={localId}>
            <Avatar src={avatarUrl} sx={{ width: 48, height: 48 }} />
            <span className={classes.driverName}>{props.name}</span>
          </Link>
          {myProfile && (
            <button
              onClick={deleteHandler}
              className={classes.deleteButton}
              aria-label="Delete route"
              title="Delete route"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-trash"
                viewBox="0 0 16 16"
              >
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                <path
                  fillRule="evenodd"
                  d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListItem;
