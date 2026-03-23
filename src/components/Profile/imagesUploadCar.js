import { useState } from "react";
import storage from "./firebaseConfig.js";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useParams } from "react-router";
import Form from "react-bootstrap/Form";
import classes from "./ImageUpload.module.css";
import { useDispatch } from "react-redux";
import { profileActions } from "../store";
import { useSelector } from "react-redux";


const ImagesUploadCaR = () => {
  const lang = useSelector((state) => state.lang.lang);

  let imagesUploadTxt = {
    EN: {
      ShowCar: "Show your car.",
      upload: 'upload'
    },

    GE: {
      ShowCar: "ატვირთე მანქანის სურათები",
      upload: 'ატვირთვა'
     
    },
  }

  const dispatch = useDispatch();
  const [images, setImages] = useState([]);
  const [percent, setPercent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const params = useParams();
  const token = localStorage.getItem("token");
  const authQuery = token && token !== "guest" ? `?auth=${token}` : "";
  let id = params.id;
  let profileUrl =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/pictures/car/" +
    id +
    ".json" +
    authQuery;
  let urlLink = "";

  const uploadHandler = (event) => {
    for (let i = 0; i < event.target.files.length; i++) {
        const file = event.target.files[i]
        if(file.type !== "image/jpg" && file.type!=='image/png' && file.type !== 'image/jpeg'){
          alert("Please upload JPG or PNG images.");
          return ;
        };
   
        const newImage = event.target.files[i];
        newImage["id"] = Math.random();
    setImages((prevState) => [...prevState, newImage]);
}
  };

  const submitHandler = (event) => {
    
    event.preventDefault();
    if (images.length === 0) {
      alert("Choose at least one image first.");
      return;
    }
    images.forEach((image) => {
        const storageRef = ref(storage, `cars/${image.name}`);
        const uploadTask = uploadBytesResumable(storageRef, image);
    
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const percent = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              setPercent(percent);
              setUploading(true);
          },
          (err) => {console.log(err)},

           async () => {
           await  getDownloadURL(uploadTask.snapshot.ref).then((url) => {
              console.log(url);
              urlLink = url;
              const sendData = async () => {
                const response = await fetch(profileUrl, {
                  method: "POST",
                  body: JSON.stringify(urlLink),
                });
                if (!response.ok) {
                  throw new Error("something went wrong"); 
                }
                
              };
              sendData()
              .then(dispatch(profileActions.carRefreshHandler()))
              
                .catch((error) => console.log(error));
            });
          }
        );

    });

   
  };



  return (
    <div>
      <div className={classes.custom}>
      <Form.Group controlId="formFileMultiple" className="mb-3" onChange={uploadHandler}>
        <Form.Label>{imagesUploadTxt[lang].ShowCar}</Form.Label>
        {uploading &&<p>%{percent}</p>}
        <Form.Control type="file" multiple  accept="image/*"/>
        <button onClick={submitHandler} disabled={images.length === 0}> {imagesUploadTxt[lang].upload}</button>
      </Form.Group>
      </div>
    </div>
  );
};

export default ImagesUploadCaR;
