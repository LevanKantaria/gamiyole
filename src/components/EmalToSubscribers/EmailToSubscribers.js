import axios from "axios"


const EmailToSubscribers = (props) => {


    
    let departure = props.departure
    let destination = props.destination
    let subscribersUrl = 'https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/subscribtions'+ departure+'/'+destination+'.json'
    
    
    const subscribers = ()=>{
        axios.get(subscribersUrl).then((res) => {
            console.log(res.data)
        })
    }
    subscribers();
    
    
    
}

export default EmailToSubscribers;