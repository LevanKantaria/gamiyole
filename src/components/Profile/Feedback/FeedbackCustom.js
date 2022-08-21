import Form from "react-bootstrap/Form";
import Rating from "@mui/material/Rating";
import { useState } from "react";
import Button from "@mui/material/Button";
import classes from "./FeedbackCustom.module.css";
import { useParams } from "react-router";
import CommentsSection from "../CommentsSection/CommentsSection";
import { useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";


const FeedbackCustom = () => {
  const lang = useSelector((state) => state.lang.lang);
let feedbackTxt = {
  EN: {
    howWasRide:'How was your ride?',
    successfullySent:'Successfully Sent',
    alert:'Please Give Rating before sending',
         
  },

  GE: {
    howWasRide:'როგორ შეაფასებდი მგზავრობას?',
    successfullySent:'წარმატებით გაიგზავნა',
    alert:'გთხოვთ შეავსოთ კომენტარი ან დაუწეროთ ვარსკვლავები გაგზავნამდე',  
  },
}
  const senderId = localStorage.getItem("localId");
  const params = useParams();
  let profileId = params.id;
  const loggedIn = localStorage.getItem("token") !== "guest";
  const [value, setValue] = useState(null);
  const [comment, setComment] = useState("");
  const [myName, setMyName] = useState("");
  const [commentSent, setCommentSent] = useState(false);

  let hostUrlRating =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/ratings/" +
    profileId +
    "/" +
    senderId +
    ".json";

  let hostUrlComment =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/comments/" +
    profileId +
    ".json";

  useEffect(() => {
    axios
      .get(
        "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/profile/" +
          senderId +
          ".json"
      )
      .then((res) => {
        
          setMyName(res.data.name);
          console.log(myName);
        
      });
  }, [senderId]);

  const commentChangeHandler = (event) => {
    setComment(event.target.value);
  };

  const sendHandler = () => {
    const sendComment = async () => {
      let commentItem = {
        comment,
        sender: senderId,
        name: myName,
      };
      const response = await fetch(hostUrlComment, {
        method: "POST",
        body: JSON.stringify(commentItem),
      });
      if (!response.ok) {
        throw new Error("something went wrong");
      }
      if (response.ok) {
      }
    };

    const sendData = async () => {
      let ratingItem = {
        ratingValue: value,
        sender: senderId,
      };
      const response = await fetch(hostUrlRating, {
        method: "PUT",
        body: JSON.stringify(ratingItem),
      });
      if (!response.ok) {
        throw new Error("something went wrong");
      }
      if (response.ok) {
      }
    };

    if (value < 1 && comment === "") {
      alert(feedbackTxt[lang].alert);
    }
    if (value > 0) {
      sendData()
        .then(setCommentSent(true), setComment(""))
        .catch((error) => console.log(error));
    }

    if (comment !== "") {
      sendComment()
        .then(setCommentSent(true), setComment(""))
        .catch((error) => console.log(error));
    }
  };

  return (
    <div>
      <CommentsSection />
      {loggedIn && (
        <Form>
          <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
            <Form.Label>{feedbackTxt[lang].howWasRide}</Form.Label>
            <Form.Control
              value={comment}
              onChange={commentChangeHandler}
              as="textarea"
              rows={3}
            />
          </Form.Group>
        </Form>
      )}
      {commentSent && <p style={{ color: "green" }}> {feedbackTxt[lang].successfullySent}</p>}
      {loggedIn && (
        <section className={classes.rating}>
          <Rating
            name="simple-controlled"
            value={value}
            onChange={(event, newValue) => {
              setValue(newValue);
            }}
          />
          <Button variant="contained" onClick={sendHandler}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              className="bi bi-send"
              viewBox="0 0 16 16"
            >
              <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
            </svg>
          </Button>
        </section>
      )}
    </div>
  );
};

export default FeedbackCustom;
