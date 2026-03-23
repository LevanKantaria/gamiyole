import React from "react";
import NavbarBoot from "./components/UI/Navbar";
import Intro from "./components/Intro/Intro";
import SubmitForm from "./components/SubmitForm/SubmitForm";
import { useEffect } from "react";
import List from "./components/List/List";
import { useDispatch, useSelector } from "react-redux";
import { listAction } from "./components/store";
import classes from "./App.module.css";
import { Route, Redirect } from "react-router-dom";
import Filter from "./components/Filter/Filter";
import SignInModal from "./components/UI/SignInModal";
import SignUpModal from "./components/UI/SignUpModal";
import ProfilePage from "./components/Profile/ProfilePage";
import CompleteProfile from "./components/Profile/CompleteProfile";
import { profileActions } from "./components/store";
import { authAction } from "./components/store";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "./firebase/client";
import Footer from "./components/UI/Footer";
import AboutPage from "./components/About/AboutPage";

function App() {
  const dispatch = useDispatch();
  let id = localStorage.getItem("localId");
  const token = useSelector((state) => state.auth.token) || localStorage.getItem("token");
  const isGuest = token === "guest";
  const isAuthenticated = Boolean(token) && !isGuest;
  const authQuery = token && token !== "guest" ? `?auth=${token}` : "";

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        const existing = localStorage.getItem("token");
        if (existing && existing !== "guest") {
          dispatch(authAction.restoreSession({ idToken: "", localId: "" }));
        }
        return;
      }
      const idToken = await user.getIdToken();
      dispatch(authAction.restoreSession({ idToken, localId: user.uid }));
    });
    return () => unsub();
  }, [dispatch]);

  // update profile Avatar once app is
  useEffect(() => {
    if (!id) {
      return;
    }
    async function fetchImgLink() {
      const response = await fetch(
        "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/pictures/profile/" +
          id +
          ".json" +
          authQuery
      );
      if (!response.ok) {
        throw new Error("Failed to get Pic Url");
      }
      let data = await response.json();

      dispatch(profileActions.avatarHandler(data));

      if (data === null) {
        dispatch(
          profileActions.avatarHandler(
            "https://t3.ftcdn.net/jpg/03/46/83/96/360_F_346839683_6nAPzbhpSkIpb8pmAwufkC7c5eD7wYws.jpg"
          )
        );
      }
    }

    fetchImgLink();
  }, [id, dispatch, authQuery]);

  //Get data and send it to Redux store , List of all published drives
  useEffect(() => {
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
            arrivalTime: data[key].arrivalTime,
            departureTime:data[key].departureTime,
          });
        }
      }
      dispatch(listAction.loadData(array));

      return data;
    }
    fetchData().catch(() => {
      dispatch(listAction.loadData([]));
    });
  }, [dispatch, authQuery]);

  return (
    <div className={classes.index}>
      <NavbarBoot />

      <Route path="/" exact>
        <Redirect to="/welcome" />
      </Route>

      <Route path="/welcome">
        <div className={classes.placeHolder}></div>
        <Intro />
        {!token && <SignInModal />}

        <Filter />

        <List />
      </Route>

      <Route path="/signin"></Route>

      <Route path="/signup">{!token && <SignUpModal />}</Route>

      <Route path="/submit">
      {!isAuthenticated ? (
        <Redirect to="/welcome" />
      ) : (
        <>
          <div className={classes.placeHolderBlue}></div>
          <SubmitForm />
        </>
      )}
      </Route>
      <Route path="/find">
      <div className={classes.placeHolder}></div>
        <div className={classes.placeHolderFilter}></div>

        <Filter />
        <List />
      </Route>
      <Route path="/profile/:id">
      <div className={classes.placeHolder}></div>
        <ProfilePage />
      </Route>
      <Route path="/complete-profile">
        {!isAuthenticated ? <Redirect to="/welcome" /> : <CompleteProfile />}
      </Route>
      <Route path="/about">
        <div className={classes.placeHolder}></div>
        <AboutPage />
      </Route>
      <Footer />
    </div>
  );
}

export default App;
