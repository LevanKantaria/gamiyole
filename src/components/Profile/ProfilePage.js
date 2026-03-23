import classes from "./ProfilePageUpdated.module.css";
import CarouselReact from "./CarouselReact";
import { useParams } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { profileActions } from "../store";
import ImageUpload from "./ImageUpload";
import ImagesUploadCaR from "./imagesUploadCar";
import RatingSection from "./RatingSection/RatingSection";
import FeedbackCustom from "./Feedback/FeedbackCustom";
import CommentsSection from "./CommentsSection/CommentsSection";
import SectionCard from "./SectionCard";
import ProfileHeaderCard from "./ProfileHeaderCard";
import { useHistory } from "react-router-dom";

const ProfilePage = () => {
  const lang = useSelector((state) => state.lang.lang);
  const history = useHistory();

  let profilePageTxt = {
    EN: {
      setUpProfile:'Set up my Profile',
      aboutMe:'About Me',
      phone: "Phone Number",
      carModel: 'Car Model',
      numberPlate:'Number Plate',
      editProfile: "Edit profile",
      uploadProfilePic: "Profile photo",
      uploadCarPics: "Car photos",
      noInfo: "Not provided",
      ageSuffix: "y/o",
      profileTitle: "Profile",
      hideUpload: "Hide uploader",
      galleryTitle: "Car gallery",
      contactTitle: "Contact",
      carTitle: "Vehicle details",
      aboutTitle: "About",
      setupTitle: "Set up your profile",
      myRoutes: "My routes",
      noRoutes: "You have not published routes yet.",
      edit: "Edit",
      remove: "Remove",
    },

    GE: {
      setUpProfile:'შეავსე პროფილი',
      aboutMe:'ჩემს შესახებ',
      phone: "ტელეფონის ნომერი",
      carModel: 'მანქანის მოდელი',
      numberPlate:'მანქანის ნომერი',
      editProfile: "პროფილის რედაქტირება",
      uploadProfilePic: "პროფილის ფოტო",
      uploadCarPics: "მანქანის ფოტოები",
      noInfo: "არ არის შევსებული",
      ageSuffix: "წლის",
      profileTitle: "პროფილი",
      hideUpload: "დამალვა",
      galleryTitle: "მანქანის გალერეა",
      contactTitle: "კონტაქტი",
      carTitle: "მანქანის დეტალები",
      aboutTitle: "ჩემს შესახებ",
      setupTitle: "შეავსე პროფილი",
      myRoutes: "ჩემი რეისები",
      noRoutes: "რეისები ჯერ არ გაქვს დამატებული.",
      edit: "რედაქტირება",
      remove: "წაშლა",
    },
  };

  const [showProfilePicUpload, setShowProfilePicUpload] = useState(false);
  const [showCarUpload, setShowCarUpload] = useState(false);
  const [myRoutes, setMyRoutes] = useState([]);
  const [profilePic, setProfilePic] = useState(
    "https://t3.ftcdn.net/jpg/03/46/83/96/360_F_346839683_6nAPzbhpSkIpb8pmAwufkC7c5eD7wYws.jpg"
  );
  const dispatch = useDispatch();
  const params = useParams();
  const localId = localStorage.getItem("localId");
  const token = localStorage.getItem("token");
  const id = params.id;
  const authQuery = token && token !== "guest" ? `?auth=${token}` : "";
  let profilePicUrl =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/pictures/profile/" +
    id +
    ".json" +
    authQuery;
  const myProfile = localId === id;

  let profileUrl =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/profile/" +
    id +
    ".json" +
    authQuery;
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
  }, [dispatch, profileUrl]);

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
  }, [dispatch, myProfile, profilePicUrl]);

  const profilePicEditHandler = () => {
    if (showProfilePicUpload) {
      setShowProfilePicUpload(false);
      return;
    }
    setShowProfilePicUpload(true);
  };

  const carPicEditHandler = () => {
    if (showCarUpload) {
      setShowCarUpload(false);
      return;
    }
    setShowCarUpload(true);
  };

  useEffect(() => {
    if (!myProfile) return;
    const listUrl =
      "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/list.json" +
      authQuery;
    fetch(listUrl)
      .then((res) => res.json())
      .then((data) => {
        const items = [];
        if (data) {
          for (const key in data) {
            if (data[key].localId === localId) {
              items.push({ id: key, ...data[key] });
            }
          }
        }
        setMyRoutes(items.reverse());
      })
      .catch(() => setMyRoutes([]));
  }, [myProfile, localId, authQuery]);

  const removeRouteHandler = async (routeId) => {
    const routeUrl =
      "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/list/" +
      routeId +
      ".json" +
      authQuery;
    const res = await fetch(routeUrl, { method: "DELETE" });
    if (res.ok) {
      setMyRoutes((prev) => prev.filter((item) => item.id !== routeId));
    }
  };

  currentProfile = useSelector((state) => state.profile);

  //if it is my profile but I Have not set up my profile yet
  if (myProfile && currentProfile.name === "") {
    return (
      <div className={classes.page}>
        <div className={classes.container}>
          <SectionCard title={profilePageTxt[lang].setupTitle}>
            <p className={classes.emptyStateText}>{profilePageTxt[lang].setUpProfile}</p>
            <button
              type="button"
              className={classes.primaryButton}
              onClick={() => history.push("/complete-profile")}
            >
              {profilePageTxt[lang].setupTitle}
            </button>
          </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <div className={classes.container}>
        <div className={classes.grid}>
          <div className={classes.leftColumn}>
            <ProfileHeaderCard
              avatar={profilePic}
              name={currentProfile.name}
              age={currentProfile.age}
              ageSuffix={profilePageTxt[lang].ageSuffix}
              myProfile={myProfile}
              labels={profilePageTxt[lang]}
              onEditProfile={() => history.push("/complete-profile")}
              onToggleProfileImageUpload={profilePicEditHandler}
              showProfilePicUpload={showProfilePicUpload}
              ratingNode={<RatingSection />}
              uploadNode={<ImageUpload />}
            />

            <SectionCard title={profilePageTxt[lang].aboutTitle}>
              <p className={classes.valueText}>
                {currentProfile.aboutMe || profilePageTxt[lang].noInfo}
              </p>
            </SectionCard>
          </div>

          <div className={classes.rightColumn}>
            <SectionCard title={profilePageTxt[lang].contactTitle}>
              <div className={classes.infoRow}>
                <span className={classes.label}>Phone</span>
                <span className={classes.value}>
                  {currentProfile.number || profilePageTxt[lang].noInfo}
                </span>
              </div>
            </SectionCard>

            <SectionCard title={profilePageTxt[lang].carTitle}>
              <div className={classes.infoRow}>
                <span className={classes.label}>{profilePageTxt[lang].carModel}</span>
                <span className={classes.value}>
                  {currentProfile.model || profilePageTxt[lang].noInfo}
                </span>
              </div>
              <div className={classes.infoRow}>
                <span className={classes.label}>{profilePageTxt[lang].numberPlate}</span>
                <span className={classes.plateBadge}>
                  {currentProfile.plate || profilePageTxt[lang].noInfo}
                </span>
              </div>
            </SectionCard>

            <SectionCard
              title={profilePageTxt[lang].galleryTitle}
              actions={
                myProfile ? (
                  <button className={classes.secondaryButton} type="button" onClick={carPicEditHandler}>
                    {showCarUpload ? profilePageTxt[lang].hideUpload : profilePageTxt[lang].uploadCarPics}
                  </button>
                ) : null
              }
            >
              {myProfile && showCarUpload && <ImagesUploadCaR />}
              <CarouselReact />
            </SectionCard>
          </div>
        </div>

        <div className={classes.bottomSection}>
          {myProfile && (
            <SectionCard title={profilePageTxt[lang].myRoutes}>
              {myRoutes.length === 0 && (
                <p className={classes.emptyStateText}>{profilePageTxt[lang].noRoutes}</p>
              )}
              {myRoutes.map((item) => (
                <div className={classes.routeRow} key={item.id}>
                  <div>
                    <p className={classes.routeMain}>
                      {item.departure} → {item.destination}
                    </p>
                    <p className={classes.routeMeta}>
                      {item.date} | {item.departureTime} - {item.arrivalTime}
                    </p>
                  </div>
                  <div className={classes.routeActions}>
                    <button
                      type="button"
                      className={classes.secondaryButton}
                      onClick={() => history.push(`/submit?edit=${item.id}`)}
                    >
                      {profilePageTxt[lang].edit}
                    </button>
                    <button
                      type="button"
                      className={classes.dangerButton}
                      onClick={() => removeRouteHandler(item.id)}
                    >
                      {profilePageTxt[lang].remove}
                    </button>
                  </div>
                </div>
              ))}
            </SectionCard>
          )}
          {!myProfile && (
            <SectionCard title="Feedback">
              <FeedbackCustom />
            </SectionCard>
          )}
          {myProfile && (
            <SectionCard title="Comments">
              <CommentsSection />
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
