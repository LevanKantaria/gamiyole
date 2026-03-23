import { useSelector } from "react-redux";
import classes from "./AboutPage.module.css";

const AboutPage = () => {
  const lang = useSelector((state) => state.lang.lang);

  const txt = {
    EN: {
      title: "About Gamiyole",
      subtitle: "InterCity transportation made easier.",
      appTitle: "About the App",
      appIntro:
        "This project was created to aid InterCity transportation. Users can publish or find drivers from one city to another.",
      appDetails:
        "High gas price is a big problem for drivers. Sometimes people drive on long roads without any passengers. It would be great if drivers could find someone who can accompany them and share gas payment. This makes travelling cheaper and more enjoyable. Every driver can create a profile where they upload contact info, car pictures, and profile picture. Passengers can give rating to drivers and leave comments on their profile.",
      featuresTitle: "Features",
      features: [
        "Finding published routes by filtering cities and date",
        "Creating user profile (uploading images, filling bio, editing and removing uploaded data)",
        "Publishing your own routes",
        "Commenting and rating other people's profiles",
      ],
      benefitsTitle: "Solved Problems and Benefits of Gamiyole",
      benefits: [
        "Drivers save money by taking passengers",
        "Passengers avoid busy public transport",
        "Roads become relatively free and faster",
        "C2 emission is reduced as efficiency of transport raises",
        "Everyone is happy",
      ],
    },
    GE: {
      title: "Gamiyole შესახებ",
      subtitle: "ქალაქებს შორის მგზავრობის გაზიარების პლატფორმა.",
      appTitle: "აპის შესახებ",
      appIntro:
        "პროექტი შექმნილია საქალაქთაშორისო მგზავრობის გასამარტივებლად. მომხმარებლებს შეუძლიათ მოძებნონ ან გამოაქვეყნონ რეისები.",
      appDetails:
        "საწვავის მაღალი ფასი მძღოლებისთვის დიდი პრობლემაა. ხშირად ადამიანები დიდ მანძილზე მგზავრობენ მგზავრების გარეშე. Gamiyole აძლევს საშუალებას მძღოლებს იპოვონ თანამგზავრი და გაინაწილონ ხარჯი. მძღოლს შეუძლია შექმნას პროფილი კონტაქტით, მანქანის ფოტოებით და პროფილის სურათით. მგზავრებს შეუძლიათ დატოვონ შეფასება და კომენტარი.",
      featuresTitle: "ფუნქციები",
      features: [
        "გამოქვეყნებული რეისების მოძებნა ქალაქისა და თარიღის ფილტრით",
        "მომხმარებლის პროფილის შექმნა (ფოტოების ატვირთვა, ბიოს შევსება, რედაქტირება)",
        "საკუთარი რეისების გამოქვეყნება",
        "სხვა მომხმარებლების შეფასება და კომენტარების დატოვება",
      ],
      benefitsTitle: "Gamiyole-ის სარგებელი",
      benefits: [
        "მძღოლები ზოგავენ თანხას",
        "მგზავრები ერიდებიან გადატვირთულ ტრანსპორტს",
        "გზები ხდება შედარებით ნაკლებად გადატვირთული",
        "ემისიები მცირდება ტრანსპორტის ეფექტურობის ზრდით",
        "ყველა მოგებულია",
      ],
    },
  };

  return (
    <main className={classes.page}>
      <div className={classes.container}>
        <section className={classes.hero}>
          <h1>{txt[lang].title}</h1>
          <p className={classes.subtitle}>{txt[lang].subtitle}</p>
          <h3>{txt[lang].appTitle}</h3>
          <p>{txt[lang].appIntro}</p>
          <p>{txt[lang].appDetails}</p>
        </section>

        <section className={classes.grid}>
          <article className={classes.card}>
            <h3>{txt[lang].featuresTitle}</h3>
            <ul>
              {txt[lang].features.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className={classes.card}>
            <h3>{txt[lang].benefitsTitle}</h3>
            <ul>
              {txt[lang].benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
};

export default AboutPage;
