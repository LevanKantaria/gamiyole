import classes from './Card.module.css'

const Card = (props) => {
return (
  <div>
<section className={classes.empty}></section>
    <div className={classes.card}>

        {props.children}
    </div>
  </div>
  );

}
export default Card;