import classes from "./Slider.module.css";
import { useParams } from "react-router";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import DeleteModal from "./DeleteModal";

function CarouselReact() {
  const [modalShow, setModalShow] = useState(false);
  const params = useParams();
  const id = params.id;
  let [linksState, setLinksState] = useState([]);
  let carClicks = useSelector((state) => state.profile.count);
  const [deleted, setDeleted] = useState(false);
  let myProfile = id === localStorage.getItem("localId");
  const token = localStorage.getItem("token");
  const authQuery = token && token !== "guest" ? `?auth=${token}` : "";
  const [index, setIndex] = useState(-1);

  const [keys, setKeys] = useState([]);

  let carPicsUrl =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/pictures/car/" +
    id;
  useEffect(() => {
    axios.get(carPicsUrl + ".json" + authQuery).then((res) => {
      const links = res.data || {};
      const entries = Object.entries(links);
      setKeys(entries.map(([key]) => key));
      setLinksState(entries.map(([, value]) => value));
    });
  }, [id, carClicks, carPicsUrl, authQuery]);

  const modalShowTrigger = (event) => {
    setModalShow(true);
    setIndex(event.target.value);
  };

  const modalCloseHandler = () => {
    setModalShow(false);
  };
  const deleteHandler = () => {
    setModalShow(false);
    console.log(index);

    fetch(carPicsUrl + "/" + keys[index] + ".json" + authQuery, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          setDeleted(true);
          setTimeout(() => {
            setDeleted(false);
          }, 500);
          setTimeout(() => {
            console.log("fetchng new imgs");
            axios.get(carPicsUrl + ".json" + authQuery).then((res) => {
              const links = res.data || {};
              const entries = Object.entries(links);
              setKeys(entries.map(([key]) => key));
              setLinksState(entries.map(([, value]) => value));
            });
          }, 500);
        } else {
          throw new Error("could not delete data");
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };
  if (linksState.length === 0) {
    return (
      <div className={classes.empty}>
        {myProfile ? "Upload car photos to show your vehicle." : "No car photos yet."}
      </div>
    );
  }

  return (
    <>
      <DeleteModal
        show={modalShow}
        onClose={modalCloseHandler}
        onDelete={deleteHandler}
      />
      {deleted && <div className={classes.deletedBanner}>Deleted.</div>}
      <div className={classes.grid}>
        {linksState.map((item, i) => (
          <article className={classes.tile} key={keys[i] || i}>
            {myProfile && (
              <button
                className={classes.button}
                value={i}
                onClick={modalShowTrigger}
                aria-label="Delete image"
                title="Delete image"
              >
                X
              </button>
            )}
            <img src={item} alt={`Car ${i + 1}`} />
          </article>
        ))}
      </div>
    </>
  );
}

export default CarouselReact;
