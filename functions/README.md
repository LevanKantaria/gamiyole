# Gamiyole push notifications

Cloud Functions (Firebase, gen 2) that send Expo push notifications on four events:

| Function | Trigger | Notifies |
| --- | --- | --- |
| `onRidePublished` | a ride is created in `list/` | passengers whose open request matches the route + date |
| `onSeatBooked` | a confirmed booking is created | the ride's driver |
| `onRideCancelled` | a ride's status flips to `cancelled` | passengers booked on it |
| `onReviewReceived` | a review is created in `ratings/` | the reviewed member |

Delivery uses [Expo's push service](https://docs.expo.dev/push-notifications/sending-notifications/) — no secret key required. Device tokens are stored by the app at `pushTokens/{uid}/{deviceKey}`.

## One-time setup

Push notifications need a **development or EAS build** of the Expo app — they do **not** work in Expo Go (SDK 53+). And the app needs an EAS `projectId` to fetch push tokens.

### 1. App: install the new native modules and set the EAS project id

```bash
cd native/ExpoApp
npm install                 # pulls in expo-notifications, expo-device, expo-constants
npx eas init                # creates the EAS project and writes extra.eas.projectId into app.json
npx eas build --profile development --platform ios   # or android; or a local dev build
```

Run the resulting build on a **physical device** (not the simulator). On first sign-in the app asks for notification permission and registers the token.

### 2. Backend: deploy the functions

```bash
cd functions
npm install
firebase deploy --only functions
```

(Also deploy the updated rules once — they add the `pushTokens` node: `firebase deploy --only database`.)

## Testing

- Quick send test without the app logic: grab a device's token from `pushTokens/{uid}` in the Realtime Database and use Expo's [push tool](https://expo.dev/notifications).
- End-to-end: sign in on a device (Passenger A) and post a ride request; from another account (Driver B) publish a matching ride; Passenger A should get a push. Watch logs with `firebase functions:log`.

## Notes / limits

- **Dedupe:** `onRidePublished` marks `requests/{id}/notified/{from}_{to}` after notifying, so a routine that materializes many rides notifies a passenger only once per route (not once per ride).
- The functions target the `europe-west1` database instance (see `DB` in `index.js`) — matches the app's region.
- Multi-device is supported: each device stores its own token under `pushTokens/{uid}`.
- Cost on Blaze is negligible at this scale (2M free invocations/month).
