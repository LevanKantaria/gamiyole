import { Carousel } from "react-bootstrap";
import classes from "./Slider.module.css";
import { useParams } from "react-router";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import Alert from "react-bootstrap/Alert";
import DeleteModal from "./DeleteModal";

function CarouselReact() {
  const [modalShow, setModalShow] = useState(false);
  const params = useParams();
  const id = params.id;
  let carLinksArray = [];
  let [linksState, setLinksState] = useState([]);
  let carClicks = useSelector((state) => state.profile.count);
  const [deleted, setDeleted] = useState(false);
  let myProfile = id === localStorage.getItem("localId");
  const [index, setIndex] = useState(-1);

  const [keys, setKeys] = useState([]);
  let keyList = [];

  let carPicsUrl =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/pictures/car/" +
    id;
  let mappedImages = [];

  useEffect(() => {
    axios.get(carPicsUrl + ".json").then((res) => {
      const links = res.data;

      for (const key in links) {
        let linkString = links[key];
        keyList.push(key);
        carLinksArray.push(linkString);
      }
      setKeys(keyList);
      setLinksState(carLinksArray);
    });
  }, [id, carClicks]);

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

    fetch(carPicsUrl + "/" + keys[index] + ".json", {
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
            axios.get(carPicsUrl + ".json").then((res) => {
              const links = res.data;

              for (const key in links) {
                let linkString = links[key];
                keyList.push(key);
                carLinksArray.push(linkString);
              }

              setKeys(keyList);
              setLinksState(carLinksArray);
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
  for (let i = 0; i < linksState.length; i++) {
    mappedImages.push(
      <Carousel.Item key={i}>
        {deleted && (
          <Alert variant="success">
            <Alert.Heading>Deleted!</Alert.Heading>
          </Alert>
        )}
        {myProfile && (
          <button
            className={classes.button}
            value={i}
            onClick={modalShowTrigger}
          >
            X
          </button>
        )}
        <img className="d-block w-100" src={linksState[i]} alt={i} />
        <Carousel.Caption></Carousel.Caption>
      </Carousel.Item>
    );
  }
  return (
    <>
      <DeleteModal
        show={modalShow}
        onClose={modalCloseHandler}
        onDelete={deleteHandler}
      />
      <Carousel interval={null} className={classes.wrap} variant="dark">
        {mappedImages}
      </Carousel>
    </>
  );
}

export default CarouselReact;
