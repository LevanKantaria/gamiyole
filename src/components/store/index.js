import { configureStore, createSlice } from "@reduxjs/toolkit";

const storedLang = localStorage.getItem("lang");

const langSlice = createSlice({
  name: "lang",
  initialState: { lang: storedLang === "EN" ? "EN" : "GE" },
  reducers: {
    langToggle(state, action) {
      state.lang = action.payload;
      localStorage.setItem("lang", action.payload);
    },
  },
});

// Populated by the onAuthStateChanged listener in App.js — the Firebase SDK
// owns token persistence and refresh, nothing auth-related lives in localStorage.
const authSlice = createSlice({
  name: "auth",
  initialState: {
    uid: null,
    email: null,
    initialized: false,
    isAdmin: false,
    isSuspended: false,
  },
  reducers: {
    setUser(state, action) {
      state.uid = action.payload?.uid || null;
      state.email = action.payload?.email || null;
      state.initialized = true;
      if (!state.uid) {
        state.isAdmin = false;
        state.isSuspended = false;
      }
    },
    setIsAdmin(state, action) {
      state.isAdmin = !!action.payload;
    },
    setIsSuspended(state, action) {
      state.isSuspended = !!action.payload;
    },
  },
});

// The signed-in user's own profile (for navbar avatar, publish prefill, etc.).
const profileSlice = createSlice({
  name: "profile",
  initialState: { data: null, avatarUrl: null, loaded: false },
  reducers: {
    setProfile(state, action) {
      state.data = action.payload;
      state.loaded = true;
    },
    setAvatar(state, action) {
      state.avatarUrl = action.payload;
    },
    clearProfile(state) {
      state.data = null;
      state.avatarUrl = null;
      state.loaded = false;
    },
  },
});

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    profile: profileSlice.reducer,
    lang: langSlice.reducer,
  },
});

export const authAction = authSlice.actions;
export const profileActions = profileSlice.actions;
export const langActions = langSlice.actions;
export default store;
