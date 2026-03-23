import Avatar from "@mui/material/Avatar";
import SectionCard from "./SectionCard";
import classes from "./ProfilePageUpdated.module.css";

const ProfileHeaderCard = ({
  avatar,
  name,
  age,
  ageSuffix,
  myProfile,
  labels,
  onEditProfile,
  onToggleProfileImageUpload,
  showProfilePicUpload,
  ratingNode,
  uploadNode,
}) => {
  const editIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5L13.5 4.793L14.793 3.5L12.5 1.207zM12.793 5.5L10.5 3.207L4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293z"
      />
    </svg>
  );

  const actions = myProfile ? (
    <button type="button" className={classes.primaryButton} onClick={onEditProfile}>
      {labels.editProfile}
    </button>
  ) : null;

  return (
    <SectionCard title={labels.profileTitle} actions={actions}>
      <div className={classes.headerRow}>
        <div className={classes.avatarWrap}>
          <Avatar alt="Profile" src={avatar} sx={{ width: 108, height: 108 }} />
          {myProfile && (
            <button
              type="button"
              className={classes.iconEditButton}
              onClick={onToggleProfileImageUpload}
              aria-label={labels.uploadProfilePic}
              title={labels.uploadProfilePic}
            >
              {editIcon}
            </button>
          )}
        </div>
        <div className={classes.headerMeta}>
          <h2>{name || labels.noInfo}</h2>
          {age ? <p>{age} {ageSuffix}</p> : <p>{labels.noInfo}</p>}
          {ratingNode}
        </div>
      </div>
      {myProfile && showProfilePicUpload && <div className={classes.uploadWrap}>{uploadNode}</div>}
    </SectionCard>
  );
};

export default ProfileHeaderCard;
