// Ride preference badges — keys are stored on ride records and shared with
// the web app; labels come from i18n (badges.<key>), icons are MaterialIcons.
export const RIDE_BADGES = [
  { key: 'noSmoking', icon: 'smoke-free' },
  { key: 'pets', icon: 'pets' },
  { key: 'music', icon: 'music-note' },
  { key: 'ac', icon: 'ac-unit' },
  { key: 'luggage', icon: 'luggage' },
  { key: 'maxTwoBack', icon: 'airline-seat-recline-extra' },
];

export const BADGE_ICONS = Object.fromEntries(RIDE_BADGES.map((b) => [b.key, b.icon]));
