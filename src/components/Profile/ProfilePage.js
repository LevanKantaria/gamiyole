import classes from "./ProfilePageUpdated.module.css";
import CarouselReact from "./CarouselReact";
import { useParams } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { profileActions } from "../store";
import ImageUpload from "./ImageUpload";
import ImagesUploadCaR from "./imagesUploadCar";
import Avatar from "@mui/material/Avatar";
import RatingSection from "./RatingSection/RatingSection";
import FeedbackCustom from "./Feedback/FeedbackCustom";
import CommentsSection from "./CommentsSection/CommentsSection";

const ProfilePage = () => {
  const lang = useSelector((state) => state.lang.lang);

  let profilePageTxt = {
    EN: {
      setUpProfile:'Set up my Profile',
      aboutMe:'About Me',
      phone: "Phone Number",
      carModel: 'Car Model',
      numberPlate:'Number Plate',
      
      
      
    },

    GE: {
      setUpProfile:'შეავსე პროფილი',
      aboutMe:'ჩემს შესახებ',
      phone: "ტელეფონის ნომერი",
      carModel: 'მანქანის მოდელი',
      numberPlate:'მანქანის ნომერი',
   
    },
  }

  const [ratingValue, setRatingValue] = useState(3);
  const [editButton, setEditButton] = useState("Edit Profile Pic");
  const [carEditButton, setCarEditButton] = useState("Edit");

  const [showProfilePicUpload, setShowProfilePicUpload] = useState(false);
  const [showCarUpload, setShowCarUpload] = useState(false);
  const [profilePic, setProfilePic] = useState(
    "https://t3.ftcdn.net/jpg/03/46/83/96/360_F_346839683_6nAPzbhpSkIpb8pmAwufkC7c5eD7wYws.jpg"
  );
  const dispatch = useDispatch();
  const params = useParams();
  const localId = localStorage.getItem("localId");
  const id = params.id;
  let profilePicUrl =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/pictures/profile/" +
    id +
    ".json";
  // const [id, setId] = useState();
  const myProfile = localId === id;
  let profileLabel = "Complete my profile";

  let profileUrl =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/profile/" +
    id +
    ".json";
  let currentProfile = {};

  useEffect(() => {
    async function fetchData() {
      const response = await fetch(profileUrl);

      if (!response.ok) {
        console.log("now");
        throw new Error("No Fetching  fiuuuck");
      }
      let data = await response.json();

      if (data === null) {
        console.log("empty data");

        let dummy = {
          name: "",
          model: "",
          plate: "",
          number: "",
          aboutMe: "",
          age: "",
        };
        dispatch(profileActions.newProfileHandler(dummy));
        return;
      }
      console.log(data);
      dispatch(profileActions.newProfileHandler(data));
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    async function fetchImgLink() {
      const response = await fetch(profilePicUrl);
      if (!response.ok) {
        throw new Error("Failed to get Pic Url");
      }
      let dataImg = await response.json();
      setProfilePic(dataImg);
      if (myProfile) {
        dispatch(profileActions.avatarHandler(dataImg));
      }
      if (dataImg === null) {
        setProfilePic(
          "https://t3.ftcdn.net/jpg/03/46/83/96/360_F_346839683_6nAPzbhpSkIpb8pmAwufkC7c5eD7wYws.jpg"
        );
      }
    }

    fetchImgLink();
  }, [id]);

  const profilePicEditHandler = () => {
    if (showProfilePicUpload) {
      setShowProfilePicUpload(false);
      setEditButton("Edit Profile Pic");

      return;
    }
    setShowProfilePicUpload(true);
    setEditButton("Close");
  };

  const ProfilePicButton = (
    <section>
      {myProfile && (
        <button
          className={classes.customButton}
          type="button"
          onClick={profilePicEditHandler}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="25"
            height="25"
           
            className="bi bi-file-image"
            viewBox="0 0 16 16"
          >
            <path d="M8.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
            <path d="M12 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zM3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8l-2.083-2.083a.5.5 0 0 0-.76.063L8 11 5.835 9.7a.5.5 0 0 0-.611.076L3 12V2z" />
          </svg>
        </button>
      )}
    </section>
  );
  const carPicEditHandler = () => {
    if (showCarUpload) {
      setShowCarUpload(false);
      setCarEditButton("Edit");

      return;
    }
    setShowCarUpload(true);
    setCarEditButton("Close");
  };

  currentProfile = useSelector((state) => state.profile);

  if (myProfile && currentProfile.name) {
    profileLabel = "Edit my profile";
  }

  //if it is my profile but I Have not set up my profile yet
  if (myProfile && currentProfile.name === "") {
    return (
      <div className={classes.wrapper}>
        <div className={classes.top}>
          <div className={classes.topleft}>
            {myProfile && (
              <Link to="/complete-profile"> {profilePageTxt[lang].setUpProfile}</Link>
            )}
          </div>
          <div className={classes.topright}>
            <img src={profilePic} width="250" height="250"></img>
          </div>
        </div>
        <div className={classes.mid}>
          {currentProfile.name && <CarouselReact />}
        </div>
        <div className={classes.bottom}></div>
      </div>
    );
  }

  return (
    <div className={classes.wrapper}>
      <div className={classes.mainDiv}>
        <div className={classes.profileImage}>
          <Avatar
            alt="My Profile Image"
            src={profilePic}
            sx={{ width: 150, height: 150 }}
          />

          <section className={classes.profilePicEditButton}>
            {ProfilePicButton}
          </section>
        </div>
        {myProfile && showProfilePicUpload && <ImageUpload />}
        <section className={classes.nameAndRating}>
          <div><h3>{currentProfile.name} </h3> <div> {currentProfile.age}  y/o</div></div>
          <RatingSection />
          {/* Her will go Rating Section */}
        </section>
        <div className={classes.edit}>
          {myProfile && (
            <Link to="/complete-profile">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                className="bi bi-pencil"
                viewBox="0 0 16 16"
              >
                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
              </svg>{" "}
            </Link>
          )}
        </div>
        <section className={classes.infoTitle}>
          <h4>{profilePageTxt[lang].aboutMe} </h4>
          <section className={classes.info}>{currentProfile.aboutMe} </section>
        </section>

        <section className={classes.infoTitle}>
          <h4>{profilePageTxt[lang].phone}</h4>
          <section className={classes.info}> {currentProfile.number}</section>
        </section>

        <section className={classes.infoTitle}>
          <h4>{profilePageTxt[lang].carModel}</h4>
          <section className={classes.info}> {currentProfile.model}</section>
        </section>

        <section className={classes.infoTitle}>

          <h4>{profilePageTxt[lang].numberPlate}</h4>
          <div className={classes.plateBackground}>
          <section className={classes.info}> {currentProfile.plate}</section>
          </div>
        </section>

        <CarouselReact />
        {myProfile && (
          <div className={classes.carPicEditButton}>
            <button
              className={classes.customButton}
              onClick={carPicEditHandler}
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-upload"
                viewBox="0 0 16 16"
              >
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z" />
              </svg>
            </button>
            {myProfile && showCarUpload && <ImagesUploadCaR />}
          </div>
        )}

        {!myProfile && (
          <div className={classes.feedback}>
            <FeedbackCustom />
          </div>
        )}
        {myProfile && <CommentsSection />}
      </div>
    </div>
  );
};

export default ProfilePage;
