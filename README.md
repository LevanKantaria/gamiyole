# Gamiyole — Carpooling in Georgia

Gamiyole connects drivers and passengers travelling between Georgian cities.
Drivers publish a ride (route, date, time, price per seat); passengers search,
check the driver's profile and reviews, and book a seat. Fuel costs get shared,
roads get emptier, travel gets cheaper.

**Live:** [www.gamiyole.me](https://www.gamiyole.me)

## Apps in this repo

| Path | What it is |
| --- | --- |
| `src/` | Web app (React 18 + Redux Toolkit + Firebase) |
| `native/ExpoApp/` | Mobile app (Expo / React Native), shares the same Firebase backend |
| `functions/` | Cloud Functions for push notifications — see [functions/README.md](functions/README.md) |

## Features

- Search rides by route and date; live upcoming-rides feed
- Seat booking with transactional seat counts (no double-booking)
- Public member profiles with photos, car details and **reviews for both
  drivers and passengers** (one review per member pair, star rating + comment)
- Driver/passenger roles, bilingual UI (Georgian / English)
- Email + Google sign-in through the Firebase Auth SDK
- **Web admin panel** at `/admin`: driver management, suspending/restoring
  driver access, ride moderation and review moderation

## Development

```bash
npm install
npm start          # dev server on http://localhost:3000
npm run build      # production build
```

## Firebase setup

- Config lives in `src/firebase.js`.
- Database rules: `database.rules.json` — deploy with
  `firebase deploy --only database`. **The web app relies on these rules**
  (public read of the ride list, per-user write protection, admin permissions).
- Storage rules: `storage.rules` — deploy with `firebase deploy --only storage`.

### Making someone an admin

Admins are managed in the Firebase console (never from the client):

1. Open Realtime Database and create `admins/<their-uid>: true`.
2. That user now sees the **Admin panel** entry in the web navbar and the
   database rules grant them moderation rights (suspend drivers, delete rides
   and reviews).

Suspending a driver writes `disabledDrivers/<uid>`; the database rules then
reject any new ride publication from that account, so enforcement is
server-side — not just hidden UI.
