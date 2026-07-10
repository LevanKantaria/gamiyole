import { useEffect } from "react";
import { Route, Switch, Redirect, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db } from "./firebase";
import { authAction, profileActions } from "./components/store";
import { checkIsAdmin } from "./services/admin";
import { subscribeProfile } from "./services/profile";
import Navbar from "./components/UI/Navbar";
import Footer from "./components/UI/Footer";
import HomePage from "./components/Home/HomePage";
import FindPage from "./components/Rides/FindPage";
import PublishPage from "./components/Rides/PublishPage";
import SignInPage from "./components/Auth/SignInPage";
import SignUpPage from "./components/Auth/SignUpPage";
import ProfilePage from "./components/Profile/ProfilePage";
import CompleteProfile from "./components/Profile/CompleteProfile";
import AdminPage from "./components/Admin/AdminPage";
import PrivacyPage from "./components/Pages/PrivacyPage";
import RequestsPage from "./components/Requests/RequestsPage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  const dispatch = useDispatch();
  const uid = useSelector((state) => state.auth.uid);

  // The Firebase SDK owns session persistence and token refresh.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      dispatch(authAction.setUser(user ? { uid: user.uid, email: user.email } : null));
      if (!user) {
        dispatch(profileActions.clearProfile());
        return;
      }
      const [isAdmin, disabledSnap] = await Promise.all([
        checkIsAdmin(user.uid),
        get(ref(db, `disabledDrivers/${user.uid}`)).catch(() => null),
      ]);
      dispatch(authAction.setIsAdmin(isAdmin));
      dispatch(authAction.setIsSuspended(!!disabledSnap?.exists()));
    });
    return unsubscribe;
  }, [dispatch]);

  // Keep the signed-in user's own profile (navbar avatar, prefills) in sync.
  // Routine rides are materialized upfront when a routine is created/resumed,
  // so no per-session top-up is needed here.
  useEffect(() => {
    if (!uid) return undefined;
    return subscribeProfile(uid, (profile) => {
      dispatch(profileActions.setProfile(profile));
      dispatch(profileActions.setAvatar(profile.image));
    });
  }, [uid, dispatch]);

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        <Switch>
          <Route path="/" exact>
            <HomePage />
          </Route>
          <Route path="/welcome">
            <Redirect to="/" />
          </Route>
          <Route path="/find">
            <FindPage />
          </Route>
          <Route path="/publish">
            <PublishPage />
          </Route>
          <Route path="/requests">
            <RequestsPage />
          </Route>
          <Route path="/submit">
            <Redirect to="/publish" />
          </Route>
          <Route path="/signin">
            <SignInPage />
          </Route>
          <Route path="/signup">
            <SignUpPage />
          </Route>
          <Route path="/profile/:id">
            <ProfilePage />
          </Route>
          <Route path="/complete-profile">
            <CompleteProfile />
          </Route>
          <Route path="/admin">
            <AdminPage />
          </Route>
          <Route path="/privacy">
            <PrivacyPage />
          </Route>
          <Redirect to="/" />
        </Switch>
      </main>
      <Footer />
    </>
  );
}

export default App;
