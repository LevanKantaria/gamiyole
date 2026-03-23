import classes from "./ProfilePageUpdated.module.css";

const SectionCard = ({ title, children, actions }) => {
  return (
    <section className={classes.card}>
      <header className={classes.cardHeader}>
        <h3>{title}</h3>
        {actions && <div className={classes.cardActions}>{actions}</div>}
      </header>
      <div className={classes.cardBody}>{children}</div>
    </section>
  );
};

export default SectionCard;
