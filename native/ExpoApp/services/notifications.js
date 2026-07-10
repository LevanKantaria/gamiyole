import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { ref, set, onValue, update } from 'firebase/database';
import { db } from '../firebase';

// Per-type notification preferences. Absent = enabled (default on).
export const NOTIFICATION_TYPES = ['ride', 'booking', 'cancellation', 'review'];

export const subscribeNotificationPrefs = (uid, callback) =>
  onValue(ref(db, `notificationPrefs/${uid}`), (snap) => {
    const val = snap.exists() ? snap.val() : {};
    const prefs = {};
    NOTIFICATION_TYPES.forEach((type) => {
      prefs[type] = val[type] !== false;
    });
    callback(prefs);
  });

export const setNotificationPref = (uid, type, enabled) =>
  update(ref(db, `notificationPrefs/${uid}`), { [type]: enabled });

// Show a banner + play sound for notifications that arrive while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Registers this device for Expo push and stores its token at
// pushTokens/{uid}/{deviceKey}. Idempotent — safe to call on every sign-in.
// Registers the device and returns a diagnostic result so the UI can show
// exactly what happened: { status, token?, error? }.
//   'ok'          — token registered
//   'no-user'     — not signed in
//   'simulator'   — not a physical device
//   'denied'      — notification permission denied
//   'no-project'  — missing EAS projectId (run `eas init`, rebuild)
//   'error'       — getExpoPushTokenAsync threw (usually a missing push
//                   entitlement in the build); see `error`
export async function registerForPushNotifications(uid) {
  if (!uid) return { status: 'no-user' };
  if (!Device.isDevice) return { status: 'simulator' };

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return { status: 'denied' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#1d4ed8',
    });
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) return { status: 'no-project' };

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return { status: 'error', error: 'no token returned' };
    // Key by a token fragment so multiple devices per user coexist and
    // re-registering the same device overwrites rather than duplicates.
    const deviceKey = token.replace(/[^a-zA-Z0-9]/g, '').slice(-24);
    await set(ref(db, `pushTokens/${uid}/${deviceKey}`), token);
    return { status: 'ok', token };
  } catch (err) {
    console.warn('Push token registration failed', err);
    return { status: 'error', error: String(err?.message || err) };
  }
}

// Maps a notification's data.type to a screen and navigates there on tap.
export function routeFromNotification(navigation, data) {
  if (!data?.type) return;
  switch (data.type) {
    case 'ride':
      navigation.navigate('Main', { screen: 'Find' });
      break;
    case 'booking':
    case 'cancellation':
      navigation.navigate('Main', { screen: 'Trips' });
      break;
    case 'review':
      navigation.navigate('Main', { screen: 'Profile' });
      break;
    default:
      break;
  }
}
