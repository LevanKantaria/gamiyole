import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import classes from "./ProfilePage.module.css";
import { useT, useLang } from "../../i18n";
import {
  subscribeProfile,
  uploadProfileImage,
  uploadCarPhoto,
  removeCarPhoto,
} from "../../services/profile";
import { getUserRides } from "../../services/rides";
import { getUserBookedRides } from "../../services/bookings";
import { deleteAccount } from "../../services/account";
import Avatar from "../UI/Avatar";
import Lightbox from "../UI/Lightbox";
import VerifiedBadge from "../UI/VerifiedBadge";
import { isVerified } from "../../services/verification";
import Reviews from "./Reviews";
import RideList from "../Rides/RideList";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ProfilePage = () => {
  const t = useT();
  const lang = useLang();
  const { id } = useParams();
  const { uid, initialized, isSuspended } = useSelector((state) => state.auth);
  const isMine = uid === id;

  const [profile, setProfile] = useState(null);
  const [rides, setRides] = useState([]);
  const [bookedRides, setBookedRides] = useState([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCar, setUploadingCar] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(null);
  const [verified, setVerified] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const avatarInputRef = useRef(null);

  const handleDeleteAccount = async () => {
    if (!window.confirm(t("deleteAccountConfirmMsg"))) return;
    setDeleting(true);
    try {
      await deleteAccount(); // signs out; app redirects on the auth-state change
    } catch {
      setDeleting(false);
      window.alert(t("deleteAccountFail"));
    }
  };
  const carInputRef = useRef(null);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeProfile(id, setProfile);
  }, [id, uid]);

  useEffect(() => {
    isVerified(id).then(setVerified);
  }, [id]);

  useEffect(() => {
    if (!uid) return;
    getUserRides(id).then(setRides).catch(() => setRides([]));
  }, [id, uid]);

  useEffect(() => {
    if (!isMine) {
      setBookedRides([]);
      return;
    }
    getUserBookedRides(uid).then(setBookedRides).catch(() => setBookedRides([]));
  }, [isMine, uid]);

  if (!initialized) return <div className="spinner" />;

  // Profile data (incl. phone numbers) is only readable by signed-in members.
  if (!uid) {
    return (
      <div className={`container ${classes.gate}`}>
        <div className={`card ${classes.gateCard}`}>
          <h2>{t("signInTitle")}</h2>
          <Link to="/signin" className="btn btnPrimary">
            {t("signIn")}
          </Link>
        </div>
      </div>
    );
  }

  if (profile === null) return <div className="spinner" />;

  const isDriver = profile.userType === "driver" || !!profile.model;

  const pickImage = (event, handler) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) return;
    handler(file);
  };

  const changeAvatar = async (file) => {
    setUploadingAvatar(true);
    try {
      await uploadProfileImage(uid, file);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const addCarPhoto = async (file) => {
    setUploadingCar(true);
    try {
      await uploadCarPhoto(uid, file, profile.carPhotos || []);
    } finally {
      setUploadingCar(false);
    }
  };

  const deleteCarPhoto = (index) => removeCarPhoto(uid, profile.carPhotos || [], index);

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(lang === "GE" ? "ka-GE" : "en-GB", {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className={`container ${classes.page}`}>
      {isMine && isSuspended && (
        <div className={`alert alertError ${classes.banner}`}>
          {t("accountDisabledBanner")}
        </div>
      )}

      <div className={`card ${classes.headerCard}`}>
        <div className={classes.avatarWrap}>
          <Avatar src={profile.image} name={profile.name} size={110} />
          {isMine && (
            <>
              <button
                type="button"
                className={classes.avatarEdit}
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? t("uploading") : t("changePhoto")}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pickImage(e, changeAvatar)}
              />
            </>
          )}
        </div>

        <div className={classes.headerInfo}>
          <div className={classes.nameRow}>
            <h1 className={classes.name}>{profile.name || "—"}</h1>
            {verified && <VerifiedBadge size={22} />}
            <span className={`badge ${isDriver ? "badgeBlue" : "badgeGrey"}`}>
              {isDriver ? t("driver") : t("passenger")}
            </span>
          </div>
          <div className={classes.metaRow}>
            {profile.age && <span>{profile.age} y/o</span>}
            {memberSince && (
              <span>
                {t("memberSince")} {memberSince}
              </span>
            )}
          </div>
          {profile.aboutMe && <p className={classes.about}>{profile.aboutMe}</p>}
          <div className={classes.contactRow}>
            {profile.number && (
              <a href={`tel:${profile.number}`} className="btn btnGhost btnSm">
                📞 {profile.number}
              </a>
            )}
            {profile.facebook && (
              <a
                href={profile.facebook}
                target="_blank"
                rel="noreferrer"
                className={`btn btnGhost btnSm ${classes.fbLink}`}
              >
                <span aria-hidden="true">f</span> {t("viewFacebook")}
              </a>
            )}
            {isMine && (
              <Link to="/complete-profile" className="btn btnGhost btnSm">
                ✏️ {t("editProfile")}
              </Link>
            )}
          </div>
        </div>
      </div>

      {isDriver && (profile.model || profile.plate || (profile.carPhotos || []).length > 0 || isMine) && (
        <div className={`card ${classes.carCard}`}>
          <h3>{t("car")}</h3>
          <div className={classes.carDetails}>
            {profile.model && (
              <div>
                <span className="label">{t("carModel")}</span>
                <strong>{profile.model}</strong>
              </div>
            )}
            {profile.plate && profile.plate !== "--" && (
              <div>
                <span className="label">{t("numberPlate")}</span>
                <span className={classes.plate}>{profile.plate}</span>
              </div>
            )}
          </div>

          {((profile.carPhotos || []).length > 0 || isMine) && (
            <>
              <span className={`label ${classes.photosLabel}`}>{t("carPhotos")}</span>
              <div className={classes.carPhotos}>
                {(profile.carPhotos || []).map((url, i) => (
                  <div key={url} className={classes.carPhotoWrap}>
                    <button
                      type="button"
                      className={classes.carPhotoButton}
                      onClick={() => setPhotoIndex(i)}
                      aria-label={`View car photo ${i + 1}`}
                    >
                      <img src={url} alt={`car ${i + 1}`} className={classes.carPhoto} />
                    </button>
                    {isMine && (
                      <button
                        type="button"
                        className={classes.carPhotoDelete}
                        onClick={() => deleteCarPhoto(i)}
                        aria-label="Delete photo"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {isMine && (
                  <>
                    <button
                      type="button"
                      className={classes.carPhotoAdd}
                      onClick={() => carInputRef.current?.click()}
                      disabled={uploadingCar}
                    >
                      {uploadingCar ? t("uploading") : "+"}
                    </button>
                    <input
                      ref={carInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => pickImage(e, addCarPhoto)}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {rides.length > 0 && (
        <section className={classes.ridesSection}>
          <h3>{t("publishedRides")}</h3>
          <RideList rides={rides.filter((r) => (r.date || "") >= new Date().toISOString().slice(0, 10))} />
        </section>
      )}

      {isMine && (
        <section className={classes.ridesSection}>
          <h3>{t("myBookings")}</h3>
          {bookedRides.length === 0 ? (
            <p className={classes.emptyText}>{t("noBookings")}</p>
          ) : (
            <RideList rides={bookedRides} />
          )}
        </section>
      )}

      <Reviews targetUid={id} targetName={profile.name} />

      {isMine && (
        <div className={classes.dangerZone}>
          <button
            type="button"
            className="btn btnDanger btnSm"
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? t("deletingAccount") : t("deleteAccount")}
          </button>
        </div>
      )}

      <Lightbox
        images={profile.carPhotos || []}
        index={photoIndex}
        onClose={() => setPhotoIndex(null)}
        onNavigate={setPhotoIndex}
      />
    </div>
  );
};

export default ProfilePage;
