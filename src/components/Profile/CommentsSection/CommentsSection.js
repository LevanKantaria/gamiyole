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
      comments:'Comments',
      noComments:'No comments yet',
    },
  
    GE: {
      comments:'კომენტარები',
      noComments:'ცარიელია',
    },
  }

  const params = useParams();
  const [comments, setComments] = useState([]);
  const token = localStorage.getItem("token");
  const authQuery = token && token !== "guest" ? `?auth=${token}` : "";
  let id = params.id;

  let url =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/comments/" +
    id +
    ".json" +
    authQuery;

  useEffect(() => {
    axios.get(url).then((res) => {
      const commentObject = res.data || {};
      const commentsArray = Object.keys(commentObject).map((key) => ({
        id: key,
        ...commentObject[key],
      }));
      setComments(commentsArray.reverse());
    });
  }, [id, url]);

  const commentsToDisplay = comments.map((item) => (
    <section className={classes.comment} key={item.id}>
      <div className={classes.commentHeader}>
        <span className={classes.author}>{item.name || "User"}</span>
      </div>
      <p className={classes.commentBody}>{item.comment}</p>
    </section>
  ));

  let noComments = comments.length===0;

  return (
    <>
      <p className={classes.placeholder}>{commentsTxt[lang].comments}</p>

      <div className={classes.div}>
        {commentsToDisplay}
        {noComments && <p className={classes.noComments}>{commentsTxt[lang].noComments}</p>}
        </div>
    </>
  );
};

export default CommentsSection;
