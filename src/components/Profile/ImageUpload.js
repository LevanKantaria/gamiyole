import { useState } from "react";
import storage from "./firebaseConfig.js";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {  useParams } from "react-router";
import Form from "react-bootstrap/Form";
import classes from "./ImageUpload.module.css";

const ImageUpload = () => {
  const [image, setImage] = useState(null);
  const [percent, setPercent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const params = useParams();
  let id = params.id;
  let profileUrl =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/pictures/profile/" +
    id +
    ".json";
  let urlLink = "";

  const uploadHandler = (event) => {
    const file = event.target.files[0]
        if(file.type !== "image/jpg" && file.type!=='image/png' && file.type !== 'image/jpeg'){
          console.log('gimme an image, bicth')
          alert('Please Upload an Image');
          return ;
        };
    setImage(event.target.files[0]);
  };

  const submitHandler = (event) => {
    event.preventDefault();
    const storageRef = ref(storage, `profiles/${image.name}`);
    const uploadTask = uploadBytesResumable(storageRef, image);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        setUploading(true);
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setPercent(percent);
      },
      (err) => console.log(err),
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          console.log(url);
          urlLink = url;
          const sendData = async () => {
            const response = await fetch(profileUrl, {
              method: "PUT",
              body: JSON.stringify(urlLink),
            });
            if (!response.ok) {
              throw new Error("something went wrong");
            }
            if (response.ok) {
              window.location.reload()

            }
          };
          sendData()
            .then()
            .catch((error) => console.log(error));
        });
      }
    );
  };



  return (
    <div>
      <div className={classes.custom}>
        <Form.Group
          controlId="formFileSm"
          className="mb-3"
          onChange={uploadHandler}
        >
          {uploading && <p>%{percent}</p>}
          <Form.Label>Choose New Profile Picture</Form.Label>
          <Form.Control type="file" size="sm" accept="image/*" />
          <button onClick={submitHandler}> upload</button>
        </Form.Group>
      </div>
    </div>
  );
};

export default ImageUpload;
