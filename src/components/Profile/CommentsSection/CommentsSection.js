import { useParams } from "react-router";
import axios from "axios";
import { useState } from "react";
import { useEffect } from "react";
import classes from "./CommentsSection.module.css";
import { useSelector } from "react-redux";

const CommentsSection = () => {
  const lang = useSelector((state) => state.lang.lang);
  let commentsTxt = {
    EN: {
      comments:'comments',
      noComments:'No Comments',
     
           
    },
  
    GE: {
      comments:'კომენტარები',
      noComments:'ცარიელია',
    },
  }

  const params = useParams();
  const [comments, setComments] = useState([]);
  let id = params.id;
  let commentsArray = [];
  let initial = true;

  let url =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/comments/" +
    id +
    ".json";

  useEffect(() => {
    if (initial) {
      initial = false;

      axios.get(url).then((res) => {
        const commentObject = res.data;

        for (let key in commentObject) {
          let comment = commentObject[key];
          commentsArray.push(comment);
        }
        setComments(commentsArray);
        console.log(commentsArray);
      });
    }
  }, [id]);

  const nameEmpty = comments.name === undefined;
  console.log(comments);
  let commentsToDisplay = comments.map((item) => (
    <section className={classes.comment} key={Math.random()}>
      <a href={item.sender}>
        {item.name === "" && "User"} {item.name != "" && item.name}
      </a>
      : {item.comment}{" "}
    </section>
  ));

  let noComments = comments.length===0

  return (
    <>
      <p className={classes.placeholder}>{commentsTxt[lang].comments}</p>

      <div className={classes.div}>
        {commentsToDisplay}
        {noComments && <p className={classes.noComments}>---  {commentsTxt[lang].noComments}    ---</p>}
        </div>
    </>
  );
};

export default CommentsSection;
