import { useState } from "react";
import classes from "./CompleteProfile.module.css";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Avatar from "@mui/material/Avatar";
import { useEffect } from "react";

const CompleteProfile = () => {
  const lang = useSelector((state) => state.lang.lang);

  let profilePageTxt = {
    EN: {
      profileUpdated: "Profile Updated Successfully",
      setUpProfile: "Set Up Your Profile Before you Continue",
      fillIn: "Please fill in the details",
      name: "Name",
      age: "Age",
      mustBeOver: "Must be over 18",
      aboutMe: "About Me",
      phone: "Phone Number",
      carModel: "Car Model",
      numberPlate: "Number Plate",
      submit: "Submit",
    },

    GE: {
      profileUpdated: "პროფილი წარმატებით განახლდა",
      setUpProfile: "სანამ გააგრძელებ შეავსე შენი პროფილი",
      fillIn: "გთხოვ შეაფსო ყველა გრაფა",
      name: "სახელი",
      age: "ასაკი",
      mustBeOver: "უნდა იყო 18 წლის ან მეტის",
      aboutMe: "ჩემს შესახებ",
      phone: "ტელეფონის ნომერი",
      carModel: "მანქანის მოდელი",
      numberPlate: "მანქანის ნომერი",
      submit: "ატვირთვა",
    },
  };

  const [profilePic, setProfilePic] = useState(
    "https://t3.ftcdn.net/jpg/03/46/83/96/360_F_346839683_6nAPzbhpSkIpb8pmAwufkC7c5eD7wYws.jpg"
  );
  const history = useHistory();
  const profileName = useSelector((state) => state.profile.name);
  let currentProfile = useSelector((state) => state.profile);

  const id = localStorage.getItem("localId");
  let path = "profile/" + id;
  const [name, setName] = useState(currentProfile.name);
  const [nameIsTouched, setNameIsTouched] = useState(false);

  const [number, setNumber] = useState(currentProfile.number);
  const [numberIsTouched, setNumberIsTouched] = useState(false);

  const [age, setAge] = useState(currentProfile.age);
  const [ageIsTouched, setAgeIsTouched] = useState(false);

  const [model, setModel] = useState(currentProfile.model);
  const [modelIsTouched, setModelIsTouched] = useState(false);

  const [plate, setPlate] = useState(currentProfile.plate);
  const [plateIsTouched, setPlateIsTouched] = useState(false);

  const [aboutMe, setAboutMe] = useState(currentProfile.aboutMe);
  const [aboutMeIsTouched, setAboutMeIsTouched] = useState(false);

  const [plate1, setPlate1] = useState(currentProfile.plate.split("-")[0]);
  const [plate2, setPlate2] = useState(currentProfile.plate.split("-")[1]);
  const [plate3, setPlate3] = useState(currentProfile.plate.split("-")[2]);
  const [key, setkey] = useState("");

  const [profileUpdated, setProfileUpdated] = useState(false);

  useEffect(() => {
    if (!plate1 || !plate2 || !plate3) {
      setPlate1("");
      setPlate2("");
      setPlate3("");
    }
  }, []);

  let url =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/profile/" +
    id +
    ".json";

  let plate1Text = [];
  let plate3Text = [];

  useEffect(() => {
    document.addEventListener("keydown", detectKeyDown, true);
  }, []);

  const detectKeyDown = (e) => {
    setkey(e.key);
  };

  const plate1ChangeHandler = (event) => {
    const plate = event.target.value;
    if (event.target.value.length === 0) {
      setPlate1("");
    }
    if (plate.length > 2) {
      return;
    }
    if (!/^[a-zA-Z]+$/.test(plate)) {
      return;
    }
    setPlate1(plate.toUpperCase());
  };

  const plate2ChangeHandler = (event) => {
    if (event.target.value.length < 4) {
      setPlate2(event.target.value);
    }
  };
  const plate3ChangeHandler = (event) => {
    const plate = event.target.value;
    if (event.target.value.length === 0) {
      setPlate3("");
    }
    if (plate.length > 2) {
      return;
    }
    if (!/^[a-zA-Z]+$/.test(plate)) {
      return;
    }
    setPlate3(plate.toUpperCase());
  };
  let plateCombined = plate1 + "-" + plate2 + "-" + plate3;

  const onNameChange = (event) => {
    setName(event.target.value);
    setNameIsTouched(true);
  };
  const onNameFocus = (event) => {
    setNameIsTouched(true);
  };

  const onAgeChange = (event) => {
    setAge(event.target.value);
    setAgeIsTouched(true);
  };
  const onAgeFocus = () => {
    setAgeIsTouched(true);
  };

  const onNumberChange = (event) => {
    setNumber(event.target.value);
    setNumberIsTouched(true);
  };
  const onNumberFocus = () => {};

  const onModelChange = (event) => {
    setModel(event.target.value);
    setModelIsTouched(true);
  };
  const onModelFocus = () => {
    setModelIsTouched(true);
  };

  const onPlateChange = (event) => {
    setPlate(event.target.value.toUpperCase());
    setPlateIsTouched(true);
  };
  const onPlateFocus = () => {
    setPlateIsTouched(true);
  };

  const onAboutMeChange = (event) => {
    setAboutMe(event.target.value);
    setAboutMeIsTouched(true);
  };
  const onAboutMeFocus = () => {
    setAboutMeIsTouched(true);
  };

  let trimmedNumber = number.replace(/ /g, "");

  const nameIsValid = (nameIsTouched || name.length > 0) && name.length > 1;
  const ageIsValid = (ageIsTouched || age.length > 0) && Number(age) > 17;
  const numberIsValid =
    (numberIsTouched || number.length > 0) && trimmedNumber.length === 9;
  const modelIsValid = (modelIsTouched || model.length > 0) && model.length > 1;
  const plateIsValid =
    plate1.length === 2 && plate2.length === 3 && plate3.length === 2;
  const aboutMeIsValid =
    (aboutMeIsTouched || aboutMe.length > 0) && aboutMe.length > 3;

  const formIsValid =
    nameIsValid &&
    ageIsValid &&
    numberIsValid &&
    modelIsValid &&
    plateIsValid &&
    aboutMeIsValid;

  const submitHandler = (event) => {
    console.log(name);
    event.preventDefault();
    if (!formIsValid) {
      setNameIsTouched(true);
      setAgeIsTouched(true);
      setNumberIsTouched(true);
      setPlateIsTouched(true);
      setModelIsTouched(true);
      setAboutMeIsTouched(true);
      return;
    }

    let newItem = {
      name,
      number: trimmedNumber,
      model,
      plate: plateCombined,
      aboutMe,
      age,
    };

    const sendData = async () => {
      const response = await fetch(url, {
        method: "PUT",
        body: JSON.stringify(newItem),
      });
      if (!response.ok) {
        throw new Error("something went wrong");
      }
      if (response.ok) {
      }
      history.push(path);
    };
    sendData()
      .then(setProfileUpdated(true))
      .catch((error) => console.log(error));
  };

  return (
    <div className={classes.main}>
      {profileUpdated && <h1>{profilePageTxt[lang].profileUpdated}</h1>}
      <section className={classes.placeholder}>
        {" "}
        {profilePageTxt[lang].setUpProfile}
      </section>
      {!formIsValid && <h3>{profilePageTxt[lang].fillIn}</h3>}
      <section className={classes.infoTitle}>
        <h4>{profilePageTxt[lang].name} </h4>
        <section className={classes.info}>
          <input
            defaultValue={currentProfile.name}
            style={{
              backgroundColor:
                !nameIsValid && nameIsTouched && "rgba(255, 0, 0, 0.171)",
            }}
            type="text"
            placeholder="Full Name"
            onBlur={onNameFocus}
            onChange={onNameChange}
          ></input>{" "}
        </section>

        <section className={classes.infoTitle}>
          <h4>{profilePageTxt[lang].age}</h4>
          <section className={classes.info}>
            <input
              defaultValue={currentProfile.age}
              style={{
                backgroundColor:
                  !ageIsValid && ageIsTouched && "rgba(255, 0, 0, 0.171)",
              }}
              type="number"
              placeholder="Age"
              onBlur={onAgeFocus}
              onChange={onAgeChange}
            ></input>
            {age < 18 && ageIsTouched && age > 0 && (
              <p className={classes.error}>
                {" "}
                {profilePageTxt[lang].mustBeOver}
              </p>
            )}{" "}
          </section>
        </section>
      </section>

      <section className={classes.infoTitle}>
        <h4>{profilePageTxt[lang].aboutMe} </h4>
        <section className={classes.info}>
          <input
            defaultValue={currentProfile.aboutMe}
            style={{
              backgroundColor:
                !aboutMeIsValid && aboutMeIsTouched && "rgba(255, 0, 0, 0.171)",
            }}
            type="text"
            placeholder="About me"
            onBlur={onAboutMeFocus}
            onChange={onAboutMeChange}
          ></input>{" "}
        </section>
      </section>

      {/* Phone Number */}
      <section className={classes.infoTitle}>
        <h4>{profilePageTxt[lang].phone}</h4>
        <section className={classes.info}>
          <input
            className={classes.number}
            defaultValue={currentProfile.number}
            style={{
              backgroundColor:
                !numberIsValid && numberIsTouched && "rgba(255, 0, 0, 0.171)",
            }}
            type="number"
            placeholder="Number (555 55 55 55)"
            onBlur={onNumberFocus}
            onChange={onNumberChange}
          ></input>
        </section>
      </section>

      {/* Car Model */}
      <section className={classes.infoTitle}>
        <h4>{profilePageTxt[lang].carModel}</h4>
        <section className={classes.info}>
          <input
            defaultValue={currentProfile.model}
            style={{
              backgroundColor:
                !modelIsValid && modelIsTouched && "rgba(255, 0, 0, 0.171)",
            }}
            type="text"
            placeholder="Car Model ( Toyota Camry 2019)"
            onBlur={onModelFocus}
            onChange={onModelChange}
          ></input>
        </section>
      </section>

      <section className={classes.infoTitle}>
        <h4>{profilePageTxt[lang].numberPlate}</h4>
        <section className={classes.info}></section>
        <section className={classes.plateInput}>
          <input
            type="text"
            placeholder="AA"
            value={plate1}
            maxLength="5"
            onChange={plate1ChangeHandler}
          />
          -
          <input
            type="number"
            placeholder="321"
            value={plate2}
            onChange={plate2ChangeHandler}
          />
          -
          <input
            type="text"
            placeholder="AA"
            maxlength="2"
            value={plate3}
            onChange={plate3ChangeHandler}
          />
        </section>
      </section>

      <form className={classes.form}>
        <Button
          style={{
            backgroundColor:
              (!formIsValid && "grey") ||
              (formIsValid && "rgba(93, 211, 128, 0.925)"),
          }}
          onClick={submitHandler}
          variant="light"
          className={classes.button}
        >
          {profilePageTxt[lang].subm}
        </Button>
      </form>
    </div>
  );
};

export default CompleteProfile;
