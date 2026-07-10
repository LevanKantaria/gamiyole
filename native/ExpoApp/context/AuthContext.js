import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../firebase';
import { subscribeProfile, isProfileComplete } from '../services/profile';
import { registerForPushNotifications } from '../services/notifications';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [pushStatus, setPushStatus] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        setProfile(null);
        setProfileReady(true);
        setPushStatus(null);
      } else {
        setProfileReady(false);
        // Register this device for push and surface the outcome so the
        // Profile screen can show whether notifications are actually on.
        registerForPushNotifications(u.uid)
          .then(setPushStatus)
          .catch((err) => setPushStatus({ status: 'error', error: String(err?.message || err) }));
      }
    });
    return unsub;
  }, []);

  // Routine rides are materialized upfront when a routine is created/resumed
  // (see services/routines.js), so no per-session top-up is needed here.
  useEffect(() => {
    if (!user) return undefined;
    const unsub = subscribeProfile(user.uid, (p) => {
      setProfile(p);
      setProfileReady(true);
    });
    return unsub;
  }, [user]);

  const signOut = () => fbSignOut(auth);

  const value = {
    user,
    profile,
    pushStatus,
    loading: !authReady || (user && !profileReady),
    isDriver: profile?.userType === 'driver',
    profileComplete: isProfileComplete(profile),
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
