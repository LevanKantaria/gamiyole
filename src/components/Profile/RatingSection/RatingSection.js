import Rating from "@mui/material/Rating";
import { useEffect } from "react";
import { useParams } from "react-router";
import axios from "axios";
import { useState } from "react";
import classes from "./RatingSection.module.css";
import { useSelector } from "react-redux";

const RatingSection = () => {
  const lang = useSelector((state) => state.lang.lang);

  let ratingSectionTxt = {

    EN: {
      rating:'Rating',
      reviews:'reviews',
      noReviews:'No Reviews'   
      
    
      
    },

    GE: {
      rating:'რეიტინგი',
      reviews:'შეფასება',
      noReviews:'ცარიელია'   
    
   
    },
  }
  const [ratingValue, setRatingValue] = useState(3);
  const params = useParams();
  const [arrayLength, setArrayLength] = useState();
  let id = params.id;

  //   useEffect(() => {
  //     async function fetchRatings() {
  //       const res = await fetch(
  //         "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/rating/" +
  //           id
  //       );
  //       if (!res.ok) {
  //         throw new Error("Failed to get Pic Url");
  //       }
  //       let data = await res.json();
  //       setRatingValue(data);
  //       console.log(ratingValue);
  //     }
  //     fetchRatings();
  //   }, []);

  useEffect(() => {
    let ratingsArray = [];
    axios
      .get(
        "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/ratings/" +
          id +
          ".json"
      )
      .then((res) => {
        const data = res.data;
        for (const key in data) {
          ratingsArray.push(data[key].ratingValue);
        }
        let total = 0;
        for (let i = 0; i < ratingsArray.length; i++) {
          total = total + ratingsArray[i];
        }
        let average = total / ratingsArray.length;
        setRatingValue(average);
        setArrayLength(ratingsArray.length);
      });
  }, [id]);

  let ratingTxt = (<section>{ratingSectionTxt[lang].rating}: {ratingValue} ( {arrayLength} {ratingSectionTxt[lang].reviews} )</section>)
  if(arrayLength===0){
    ratingTxt=<section>{ratingSectionTxt[lang].noReviews}</section>
  }

  return (
    <div className={classes.div}>
      <Rating
        name="read-only"
        
        value={ratingValue}
        readOnly
        size="small"
      />
      <section className={classes.txt}>
        {ratingTxt}
      </section>
    </div>
  );
};

export default RatingSection;
