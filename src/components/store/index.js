import { configureStore } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";



const LangSlice = createSlice({
  name:'lang',
  initialState:{lang:'GE'},
  reducers:{
    langToggle(state,action){
      state.lang = action.payload;
      console.log(state.lang)
    }
  },
})

const ListSlice = createSlice({
  name: "list",
  initialState: { items: [], clicks:0,  filter:{destination:'Going to...', departure:'Leaving From...', date: new Date().toISOString().slice(0, 10)} },
  reducers: {
    addItem(state, action) {
     state.items.push(action.payload);      
    },
    loadData(state, action) {
      state.items = action.payload;
    },

    updateFilterList(state,action){
      state.filter.departure = action.payload.departure;
      state.filter.destination = action.payload.destination;
      state.filter.date = action.payload.date;    
    },
    clickTracker(state,action){
      state.clicks++;
    }
  },
});



const  authSlice = createSlice({
  name: "auth",
  initialState: {
    token: localStorage.getItem('token'),
    localId: localStorage.getItem('localId'),
    isLoggedIn: false,
    email:'',
    password:''
  },
  reducers: {
    logInHandler(state,action) {
      state.token = action.payload.idToken
      state.localId = action.payload.localId
      localStorage.setItem('token', action.payload.idToken)
      localStorage.setItem('localId', action.payload.localId )
    },
    logoutHandler(state,actions){
      state.token = ''
      state.localId = ''
      localStorage.removeItem('token')
      localStorage.removeItem('localId')
      localStorage.removeItem('email')
    
    },

    logInGuestHandler(state,action){
      state.token = 'guest'
      localStorage.setItem('token','guest')
      state.localId = ''

    },
    signUpHandler(state,action){
      localStorage.setItem('token', action.payload.idToken)
        localStorage.setItem('localId', action.payload.localId)
        state.email = action.payload.email
        state.password=action.payload.password      
        console.log(state.email)
      
    },
    logInHandlerGoogle(state,action) {
      state.token = action.payload.jti
      state.localId = action.payload.sub
      localStorage.setItem('token', state.token)
      localStorage.setItem('localId', state.localId )
    },
    

  }
})

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    name: '',
    model:'',
    plate:'',
    number:'',
    aboutMe:'',
    age:'',
    avatarUrl:'',
    count:0,
    email:'',
    
  },
  reducers:{
    newProfileHandler(state,action){
      state.name= action.payload.name
      state.model = action.payload.model
      state.plate = action.payload.plate
      state.number = action.payload.number
      state.aboutMe = action.payload.aboutMe
      state.age= action.payload.age     
    },
    avatarHandler(state,action){
      state.avatarUrl = action.payload
    },
    carRefreshHandler(state){
      state.count++;
      console.log(state.count + ' From Index Store')
  },
    googleEmailHandler(state,action){
      state.email= action.payload
      localStorage.setItem('email', action.payload)
      console.log(state.email)
    }
  }
  

})



const store = configureStore({
  reducer: { list: ListSlice.reducer, auth:authSlice.reducer, profile:profileSlice.reducer, lang:LangSlice.reducer },
});

export const listAction = ListSlice.actions;
export const authAction = authSlice.actions;
export const profileActions = profileSlice.actions;
export const langActions = LangSlice.actions;
export default store;
