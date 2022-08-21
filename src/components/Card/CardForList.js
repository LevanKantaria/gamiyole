import classes from './CardForList.module.css'

const CardForList = (props) => {
    return(
        <div className={classes.card}>
            {props.children}
        </div>
    )

};

export default CardForList;