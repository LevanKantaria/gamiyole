import { useState } from "react";
import classes from "./CompleteProfile.module.css";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import Button from "react-bootstrap/Button";

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
      submit: "Save Profile",
      sectionTitle: "Profile Details",
      cardHint: "Fill all fields to publish and receive ratings.",
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
      submit: "შენახვა",
      sectionTitle: "პროფილის დეტალები",
      cardHint: "შეავსე ყველა ველი, რომ ატვირთო რეისი და მიიღო შეფასებები.",
    },
  };

  const history = useHistory();
  let currentProfile = useSelector((state) => state.profile);

  const id = localStorage.getItem("localId");
  let path = "profile/" + id;
  const [name, setName] = useState(currentProfile.name || "");
  const [nameIsTouched, setNameIsTouched] = useState(false);

  const [number, setNumber] = useState(currentProfile.number || "");
  const [numberIsTouched, setNumberIsTouched] = useState(false);

  const [age, setAge] = useState(currentProfile.age || "");
  const [ageIsTouched, setAgeIsTouched] = useState(false);

  const [model, setModel] = useState(currentProfile.model || "");
  const [modelIsTouched, setModelIsTouched] = useState(false);

  const [aboutMe, setAboutMe] = useState(currentProfile.aboutMe || "");
  const [aboutMeIsTouched, setAboutMeIsTouched] = useState(false);

  const splitPlate = (currentProfile.plate || "--").split("-");
  const [plate1, setPlate1] = useState(splitPlate[0] || "");
  const [plate2, setPlate2] = useState(splitPlate[1] || "");
  const [plate3, setPlate3] = useState(splitPlate[2] || "");

  const [profileUpdated, setProfileUpdated] = useState(false);

  let url =
    "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app/profile/" +
    id +
    ".json";

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
    const plate = event.target.value.replace(/\D/g, "");
    if (plate.length < 4) {
      setPlate2(plate);
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
  const onNumberFocus = () => {
    setNumberIsTouched(true);
  };

  const onModelChange = (event) => {
    setModel(event.target.value);
    setModelIsTouched(true);
  };
  const onModelFocus = () => {
    setModelIsTouched(true);
  };

  const onAboutMeChange = (event) => {
    setAboutMe(event.target.value);
    setAboutMeIsTouched(true);
  };
  const onAboutMeFocus = () => {
    setAboutMeIsTouched(true);
  };

  let trimmedNumber = number.replace(/ /g, "");

  const nameIsValid = (nameIsTouched || name.length > 0) && name.trim().length > 1;
  const ageIsValid = (ageIsTouched || age.length > 0) && Number(age) > 17;
  const numberIsValid =
    (numberIsTouched || number.length > 0) && trimmedNumber.length === 9;
  const modelIsValid =
    (modelIsTouched || model.length > 0) && model.trim().length > 1;
  const plateIsValid =
    plate1.length === 2 && plate2.length === 3 && plate3.length === 2;
  const aboutMeIsValid =
    (aboutMeIsTouched || aboutMe.length > 0) && aboutMe.trim().length > 3;

  const formIsValid =
    nameIsValid &&
    ageIsValid &&
    numberIsValid &&
    modelIsValid &&
    plateIsValid &&
    aboutMeIsValid;

  const submitHandler = (event) => {
    event.preventDefault();
    if (!formIsValid) {
      setNameIsTouched(true);
      setAgeIsTouched(true);
      setNumberIsTouched(true);
      setModelIsTouched(true);
      setAboutMeIsTouched(true);
      return;
    }

    let newItem = {
      name: name.trim(),
      number: trimmedNumber,
      model: model.trim(),
      plate: plateCombined,
      aboutMe: aboutMe.trim(),
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
      history.push(path);
    };
    sendData()
      .then(() => setProfileUpdated(true))
      .catch((error) => console.log(error));
  };

  const inputErrorClass = (isValid, isTouched) =>
    !isValid && isTouched ? classes.invalid : "";

  return (
    <div className={classes.main}>
      <div className={classes.header}>
        <h1>{profilePageTxt[lang].sectionTitle}</h1>
        <p>{profilePageTxt[lang].cardHint}</p>
      </div>
      {profileUpdated && <p className={classes.success}>{profilePageTxt[lang].profileUpdated}</p>}
      {!formIsValid && <p className={classes.warning}>{profilePageTxt[lang].fillIn}</p>}

      <form className={classes.form} onSubmit={submitHandler}>
        <div className={classes.gridTwo}>
          <section className={classes.field}>
            <label htmlFor="name">{profilePageTxt[lang].name}</label>
            <input
              id="name"
              className={inputErrorClass(nameIsValid, nameIsTouched)}
              value={name}
              type="text"
              placeholder="Full Name"
              onBlur={onNameFocus}
              onChange={onNameChange}
            />
          </section>

          <section className={classes.field}>
            <label htmlFor="age">{profilePageTxt[lang].age}</label>
            <input
              id="age"
              className={inputErrorClass(ageIsValid, ageIsTouched)}
              value={age}
              type="number"
              placeholder="Age"
              onBlur={onAgeFocus}
              onChange={onAgeChange}
            />
            {age < 18 && ageIsTouched && age > 0 && (
              <p className={classes.error}>{profilePageTxt[lang].mustBeOver}</p>
            )}
          </section>
        </div>

        <section className={classes.field}>
          <label htmlFor="about">{profilePageTxt[lang].aboutMe}</label>
          <textarea
            id="about"
            className={inputErrorClass(aboutMeIsValid, aboutMeIsTouched)}
            value={aboutMe}
            placeholder="Tell people about your driving style and preferences"
            onBlur={onAboutMeFocus}
            onChange={onAboutMeChange}
            rows={4}
          />
        </section>

        <div className={classes.gridTwo}>
          <section className={classes.field}>
            <label htmlFor="phone">{profilePageTxt[lang].phone}</label>
            <input
              id="phone"
              className={inputErrorClass(numberIsValid, numberIsTouched)}
              value={number}
              type="number"
              placeholder="555555555"
              onBlur={onNumberFocus}
              onChange={onNumberChange}
            />
          </section>

          <section className={classes.field}>
            <label htmlFor="model">{profilePageTxt[lang].carModel}</label>
            <input
              id="model"
              className={inputErrorClass(modelIsValid, modelIsTouched)}
              value={model}
              type="text"
              placeholder="Toyota Camry 2019"
              onBlur={onModelFocus}
              onChange={onModelChange}
            />
          </section>
        </div>

        <section className={classes.field}>
          <label>{profilePageTxt[lang].numberPlate}</label>
          <div className={`${classes.plateGroup} ${!plateIsValid ? classes.invalidPlate : ""}`}>
            <input
              type="text"
              placeholder="AA"
              value={plate1}
              maxLength="2"
              onChange={plate1ChangeHandler}
            />
            <span>-</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="321"
              value={plate2}
              maxLength="3"
              onChange={plate2ChangeHandler}
            />
            <span>-</span>
            <input
              type="text"
              placeholder="AA"
              maxLength="2"
              value={plate3}
              onChange={plate3ChangeHandler}
            />
          </div>
        </section>

        <div className={classes.actions}>
        <Button
          type="submit"
          disabled={!formIsValid}
          variant="light"
          className={classes.button}
        >
          {profilePageTxt[lang].submit}
        </Button>
        </div>
      </form>
    </div>
  );
};

export default CompleteProfile;
