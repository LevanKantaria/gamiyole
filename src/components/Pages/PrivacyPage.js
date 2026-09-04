import classes from "./PrivacyPage.module.css";
import { useLang, useT } from "../../i18n";
import Seo from "../UI/Seo";

const EnglishPolicy = () => (
  <>
    <h1>Privacy Policy</h1>
    <p className={classes.updated}>Effective date: 4 July 2026</p>

    <p>
      Gamiyole (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a carpooling service that connects
      drivers and passengers travelling between cities in Georgia, available at{" "}
      <a href="https://www.gamiyole.me">www.gamiyole.me</a> and through the Gamiyole mobile
      app. This policy explains what personal data we collect, why, who can see it, and the
      choices you have. Questions or requests:{" "}
      <a href="mailto:info@gamiyole.me">info@gamiyole.me</a>.
    </p>

    <h2>1. Data we collect</h2>
    <ul>
      <li>
        <strong>Account data</strong> — your email address and sign-in credentials. If you
        use Google Sign-In, we receive your Google account email and display name.
        Authentication is handled by Google Firebase; we never see or store your password.
      </li>
      <li>
        <strong>Profile data</strong> — the details you add yourself: name, age, phone
        number, a short description, whether you are a driver or a passenger, your profile
        photo, and (for drivers) car model, number plate and car photos.
      </li>
      <li>
        <strong>Ride data</strong> — rides you publish or book: route, date, time, price,
        seats, ride preferences (e.g. no smoking), optional comments, and recurring ride
        schedules you set up.
      </li>
      <li>
        <strong>Reviews</strong> — ratings and comments you write about other members, and
        those written about you, together with your display name.
      </li>
      <li>
        <strong>Technical data</strong> — our infrastructure provider (Google Firebase)
        processes standard connection logs such as IP addresses and device information to
        operate and secure the service. We do not run third-party advertising or tracking
        and we do not sell data to anyone.
      </li>
    </ul>

    <h2>2. What other people can see</h2>
    <p>Carpooling only works if members can find and trust each other, so:</p>
    <ul>
      <li>
        <strong>Publicly visible (no account needed):</strong> published rides — route,
        date, time, price, seats, preferences and comment — together with the driver&rsquo;s
        first name, profile photo and rating; and members&rsquo; reviews and ratings.
      </li>
      <li>
        <strong>Visible to signed-in members only:</strong> full profiles, including your
        phone number, age, description and car details. Your phone number is shared so that
        drivers and passengers can coordinate a trip — that is its only purpose.
      </li>
      <li>
        <strong>Never visible to other members:</strong> your email address and your
        bookings history (only you and the affected driver can see a booking on their ride).
      </li>
    </ul>

    <h2>3. How we use your data</h2>
    <ul>
      <li>Operating the service: publishing rides, matching searches, managing bookings.</li>
      <li>
        Trust and safety: showing profiles and reviews, moderating content, and — where our
        rules are broken — suspending a driver&rsquo;s ability to publish rides.
      </li>
      <li>Responding to your messages and support requests.</li>
    </ul>
    <p>
      We process your data to perform our agreement with you (providing the service), to
      pursue our legitimate interest in keeping the platform safe, and — for optional data
      such as photos — based on your consent, which you can withdraw by removing the data.
    </p>

    <h2>4. Where your data is stored</h2>
    <p>
      Data is stored with Google Firebase (Google Cloud) in the{" "}
      <strong>europe-west1 region (Belgium, EU)</strong>. Google acts as our processor and
      provides authentication, database, file storage and hosting. Google&rsquo;s own
      privacy commitments are described at{" "}
      <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer">
        firebase.google.com/support/privacy
      </a>
      .
    </p>

    <h2>5. How long we keep it</h2>
    <ul>
      <li>Account and profile data: for as long as your account exists.</li>
      <li>
        Rides and bookings: past rides may be archived so ratings and ride history stay
        meaningful.
      </li>
      <li>
        Reviews: kept while the reviewed account exists, since they are the basis of member
        trust. Reviews that break our rules are removed by moderators.
      </li>
    </ul>

    <h2>6. Your rights</h2>
    <p>
      Under the Georgian Law on Personal Data Protection — and, where it applies, the EU
      GDPR — you may request access to the data we hold about you, correction of inaccurate
      data, deletion of your account and data, or a copy of your data. You can edit most of
      your data yourself on your profile page. For anything else, email{" "}
      <a href="mailto:info@gamiyole.me">info@gamiyole.me</a> and we will respond
      within a reasonable time, at most one month. You also have the right to lodge a
      complaint with the Personal Data Protection Service of Georgia.
    </p>

    <h2>7. Age requirement</h2>
    <p>
      Gamiyole is for adults. You must be at least 18 years old to create a profile and use
      the service. We do not knowingly collect data from anyone under 18; if you believe a
      minor is using the service, please contact us.
    </p>

    <h2>8. Security</h2>
    <p>
      All traffic is encrypted in transit (TLS). Access to data is enforced by server-side
      security rules: members can only modify their own profile, rides and reviews, and
      moderation actions are restricted to designated administrators. No system is perfectly
      secure, so please use a strong, unique password.
    </p>

    <h2>9. Changes to this policy</h2>
    <p>
      If we change this policy, the new version will be posted on this page with an updated
      effective date. Material changes will be highlighted in the app.
    </p>

    <h2>10. Contact</h2>
    <p>
      Gamiyole · <a href="mailto:info@gamiyole.me">info@gamiyole.me</a> ·{" "}
      <a href="https://www.gamiyole.me">www.gamiyole.me</a>
    </p>
  </>
);

const GeorgianPolicy = () => (
  <>
    <h1>კონფიდენციალურობის პოლიტიკა</h1>
    <p className={classes.updated}>ძალაშია: 2026 წლის 4 ივლისიდან</p>

    <p>
      Gamiyole („ჩვენ&rdquo;) არის თანამგზავრობის სერვისი, რომელიც აკავშირებს მძღოლებსა და
      მგზავრებს საქართველოს ქალაქებს შორის სამგზავროდ. სერვისი ხელმისაწვდომია{" "}
      <a href="https://www.gamiyole.me">www.gamiyole.me</a>-ზე და Gamiyole-ის მობილური
      აპლიკაციით. ეს პოლიტიკა განმარტავს, რა პერსონალურ მონაცემებს ვაგროვებთ, რატომ, ვის
      შეუძლია მათი ნახვა და რა არჩევანი გაქვს. კითხვები ან მოთხოვნები:{" "}
      <a href="mailto:info@gamiyole.me">info@gamiyole.me</a>.
    </p>

    <h2>1. რა მონაცემებს ვაგროვებთ</h2>
    <ul>
      <li>
        <strong>ანგარიშის მონაცემები</strong> — ელფოსტა და ავტორიზაციის მონაცემები.
        Google-ით შესვლისას ვიღებთ შენი Google ანგარიშის ელფოსტასა და სახელს. ავტორიზაციას
        უზრუნველყოფს Google Firebase; შენს პაროლს ჩვენ ვერასდროს ვხედავთ და არ ვინახავთ.
      </li>
      <li>
        <strong>პროფილის მონაცემები</strong> — ის, რასაც თავად ამატებ: სახელი, ასაკი,
        ტელეფონის ნომერი, მოკლე აღწერა, ხარ მძღოლი თუ მგზავრი, პროფილის ფოტო და
        (მძღოლებისთვის) მანქანის მოდელი, სახელმწიფო ნომერი და მანქანის ფოტოები.
      </li>
      <li>
        <strong>მგზავრობის მონაცემები</strong> — შენ მიერ გამოქვეყნებული ან დაჯავშნილი
        მგზავრობები: მარშრუტი, თარიღი, დრო, ფასი, ადგილები, პირობები (მაგ. მოწევის გარეშე),
        კომენტარები და შენ მიერ შექმნილი განმეორებადი განრიგები.
      </li>
      <li>
        <strong>შეფასებები</strong> — შენ მიერ სხვა წევრებზე დაწერილი და შენზე დაწერილი
        შეფასებები და კომენტარები, შენს სახელთან ერთად.
      </li>
      <li>
        <strong>ტექნიკური მონაცემები</strong> — ჩვენი ინფრასტრუქტურის პროვაიდერი (Google
        Firebase) სერვისის მუშაობისა და უსაფრთხოებისთვის ამუშავებს სტანდარტულ ტექნიკურ
        ჩანაწერებს, როგორიცაა IP მისამართები და მოწყობილობის ინფორმაცია. ჩვენ არ ვიყენებთ
        მესამე მხარის რეკლამას ან თრექინგს და მონაცემებს არავის ვყიდით.
      </li>
    </ul>

    <h2>2. რას ხედავენ სხვები</h2>
    <p>თანამგზავრობა მხოლოდ მაშინ მუშაობს, თუ წევრები ერთმანეთს იპოვიან და ენდობიან, ამიტომ:</p>
    <ul>
      <li>
        <strong>საჯაროდ ხილული (ანგარიშის გარეშეც):</strong> გამოქვეყნებული მგზავრობები —
        მარშრუტი, თარიღი, დრო, ფასი, ადგილები, პირობები და კომენტარი — მძღოლის სახელთან,
        პროფილის ფოტოსა და რეიტინგთან ერთად; ასევე წევრების შეფასებები.
      </li>
      <li>
        <strong>მხოლოდ ავტორიზებული წევრებისთვის:</strong> სრული პროფილები, მათ შორის
        ტელეფონის ნომერი, ასაკი, აღწერა და მანქანის დეტალები. ტელეფონის ნომერი ზიარდება
        მხოლოდ იმისთვის, რომ მძღოლმა და მგზავრმა მგზავრობა შეათანხმონ.
      </li>
      <li>
        <strong>სხვა წევრებისთვის არასდროს ჩანს:</strong> შენი ელფოსტა და ჯავშნების ისტორია
        (ჯავშანს ხედავ მხოლოდ შენ და შესაბამისი მგზავრობის მძღოლი).
      </li>
    </ul>

    <h2>3. როგორ ვიყენებთ შენს მონაცემებს</h2>
    <ul>
      <li>სერვისის მუშაობა: მგზავრობების გამოქვეყნება, ძებნა, ჯავშნების მართვა.</li>
      <li>
        ნდობა და უსაფრთხოება: პროფილებისა და შეფასებების ჩვენება, კონტენტის მოდერაცია და —
        წესების დარღვევის შემთხვევაში — მძღოლისთვის გამოქვეყნების უფლების შეჩერება.
      </li>
      <li>შენს შეტყობინებებსა და მოთხოვნებზე პასუხი.</li>
    </ul>
    <p>
      შენს მონაცემებს ვამუშავებთ შენთან შეთანხმების შესასრულებლად (სერვისის მიწოდება),
      პლატფორმის უსაფრთხოების ლეგიტიმური ინტერესის საფუძველზე და — არასავალდებულო
      მონაცემებზე, როგორიცაა ფოტოები — შენი თანხმობით, რომლის გახმობაც ამ მონაცემების
      წაშლით შეგიძლია.
    </p>

    <h2>4. სად ინახება მონაცემები</h2>
    <p>
      მონაცემები ინახება Google Firebase-ში (Google Cloud),{" "}
      <strong>europe-west1 რეგიონში (ბელგია, ევროკავშირი)</strong>. Google მოქმედებს როგორც
      ჩვენი დამმუშავებელი და უზრუნველყოფს ავტორიზაციას, მონაცემთა ბაზას, ფაილების შენახვასა
      და ჰოსტინგს. Google-ის კონფიდენციალურობის პირობები:{" "}
      <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer">
        firebase.google.com/support/privacy
      </a>
      .
    </p>

    <h2>5. რამდენ ხანს ვინახავთ</h2>
    <ul>
      <li>ანგარიშისა და პროფილის მონაცემები: სანამ ანგარიში არსებობს.</li>
      <li>
        მგზავრობები და ჯავშნები: წარსული მგზავრობები შეიძლება დაარქივდეს, რომ რეიტინგები და
        ისტორია სრულყოფილი დარჩეს.
      </li>
      <li>
        შეფასებები: ინახება, სანამ შეფასებული ანგარიში არსებობს, რადგან ისინი წევრებს შორის
        ნდობის საფუძველია. წესების დამრღვევ შეფასებებს მოდერატორები შლიან.
      </li>
    </ul>

    <h2>6. შენი უფლებები</h2>
    <p>
      „პერსონალურ მონაცემთა დაცვის შესახებ&rdquo; საქართველოს კანონით — და, სადაც
      ვრცელდება, ევროკავშირის GDPR-ით — შეგიძლია მოითხოვო შენს შესახებ არსებულ მონაცემებზე
      წვდომა, უზუსტო მონაცემების გასწორება, ანგარიშისა და მონაცემების წაშლა ან მონაცემების
      ასლი. მონაცემების უმეტესობის რედაქტირება თავად შეგიძლია პროფილის გვერდზე. სხვა
      მოთხოვნებისთვის მოგვწერე{" "}
      <a href="mailto:info@gamiyole.me">info@gamiyole.me</a>-ზე — ვუპასუხებთ
      გონივრულ ვადაში, არაუგვიანეს ერთი თვისა. ასევე გაქვს უფლება, საჩივრით მიმართო
      საქართველოს პერსონალურ მონაცემთა დაცვის სამსახურს.
    </p>

    <h2>7. ასაკობრივი შეზღუდვა</h2>
    <p>
      Gamiyole სრულწლოვნებისთვისაა. პროფილის შესაქმნელად და სერვისის გამოსაყენებლად უნდა
      იყო მინიმუმ 18 წლის. ჩვენ შეგნებულად არ ვაგროვებთ 18 წლამდე პირების მონაცემებს; თუ
      ფიქრობ, რომ სერვისს არასრულწლოვანი იყენებს, გთხოვ, დაგვიკავშირდე.
    </p>

    <h2>8. უსაფრთხოება</h2>
    <p>
      ყველა კავშირი დაშიფრულია (TLS). მონაცემებზე წვდომას სერვერის მხარეს უსაფრთხოების
      წესები აკონტროლებს: წევრებს მხოლოდ საკუთარი პროფილის, მგზავრობებისა და შეფასებების
      შეცვლა შეუძლიათ, ხოლო მოდერაცია მხოლოდ დანიშნულ ადმინისტრატორებს შეუძლიათ.
      სრულყოფილად დაცული სისტემა არ არსებობს, ამიტომ გამოიყენე ძლიერი, უნიკალური პაროლი.
    </p>

    <h2>9. ცვლილებები ამ პოლიტიკაში</h2>
    <p>
      პოლიტიკის ცვლილების შემთხვევაში ახალი ვერსია გამოქვეყნდება ამ გვერდზე, განახლებული
      თარიღით. მნიშვნელოვან ცვლილებებს აპლიკაციაშივე გამოვაჩენთ.
    </p>

    <h2>10. კონტაქტი</h2>
    <p>
      Gamiyole · <a href="mailto:info@gamiyole.me">info@gamiyole.me</a> ·{" "}
      <a href="https://www.gamiyole.me">www.gamiyole.me</a>
    </p>

    <p className={classes.note}>
      ამ თარგმანსა და ინგლისურ ვერსიას შორის შეუსაბამობის შემთხვევაში უპირატესობა ინგლისურ
      ვერსიას ენიჭება.
    </p>
  </>
);

// Language follows the app-wide toggle in the navbar.
const PrivacyPage = () => {
  const lang = useLang();
  const t = useT();
  return (
    <div className={`container ${classes.page}`}>
      <Seo title={t("seoPrivacyTitle")} description={t("seoPrivacyDesc")} />
      <article className={`card ${classes.doc}`}>
        {lang === "GE" ? <GeorgianPolicy /> : <EnglishPolicy />}
      </article>
    </div>
  );
};

export default PrivacyPage;
