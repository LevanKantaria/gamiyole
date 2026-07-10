import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Card from './ui/Card';
import { useLocale } from '../context/LocaleContext';
import { colors, spacing, radius } from '../theme';

const FB_BLUE = '#1877f2';

// A ride offer surfaced from a public Facebook group (see services/external.js).
// Visually distinct from real gamiyole rides: not bookable, no driver profile,
// no republished contact — just the route and a link out to the original post,
// clearly flagged as unverified.
const ExternalRideCard = ({ ride }) => {
  const { t } = useLocale();
  const seats = parseInt(ride.seats, 10);

  const openPost = () => {
    if (ride.sourceUrl) Linking.openURL(ride.sourceUrl).catch(() => {});
  };

  return (
    <View style={styles.cardWrap}>
      <View style={styles.accent} />
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.routeCol}>
            <View style={styles.cityRow}>
              {ride.departureTime ? (
                <Text style={styles.time}>{ride.departureTime}</Text>
              ) : null}
              <MaterialIcons name="trip-origin" size={16} color={colors.textMuted} />
              <Text style={styles.city} numberOfLines={1}>{ride.departure}</Text>
            </View>
            <View style={styles.connector} />
            <View style={styles.cityRow}>
              {ride.departureTime ? <View style={styles.timeSpacer} /> : null}
              <MaterialIcons name="location-on" size={16} color={colors.textMuted} />
              <Text style={styles.city} numberOfLines={1}>{ride.destination}</Text>
            </View>
          </View>

          <View style={styles.sourceBadge}>
            <MaterialIcons name="facebook" size={13} color={FB_BLUE} />
            <Text style={styles.sourceText}>{t('rideCard.externalBadge')}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Meta icon="event" text={ride.date} />
          {Number.isFinite(seats) && seats > 0 ? (
            <Meta icon="airline-seat-recline-normal" text={t('rideCard.externalSeats', { n: seats })} />
          ) : null}
        </View>

        {ride.text ? (
          <Text style={styles.postText} numberOfLines={5}>“{ride.text}”</Text>
        ) : null}

        <Text style={styles.note}>{t('rideCard.externalNote')}</Text>

        {ride.sourceUrl ? (
          <TouchableOpacity style={styles.viewBtn} onPress={openPost} activeOpacity={0.7}>
            <Text style={styles.viewBtnText}>
              {ride.linkType === 'group' ? t('rideCard.externalViewGroup') : t('rideCard.externalViewPost')}
            </Text>
            <MaterialIcons name="open-in-new" size={16} color={FB_BLUE} />
          </TouchableOpacity>
        ) : null}
      </Card>
    </View>
  );
};

const Meta = ({ icon, text }) => (
  <View style={styles.meta}>
    <MaterialIcons name={icon} size={15} color={colors.textMuted} />
    <Text style={styles.metaText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  cardWrap: { marginBottom: spacing.lg, flexDirection: 'row' },
  accent: {
    width: 4,
    backgroundColor: FB_BLUE,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    marginRight: -2,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeCol: { flex: 1, paddingRight: spacing.md },
  cityRow: { flexDirection: 'row', alignItems: 'center' },
  time: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginRight: spacing.sm,
    minWidth: 40,
    fontVariant: ['tabular-nums'],
  },
  timeSpacer: { minWidth: 40, marginRight: spacing.sm },
  city: { fontSize: 17, fontWeight: '700', color: colors.text, marginLeft: spacing.sm, flexShrink: 1 },
  connector: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
    marginLeft: 7,
    marginVertical: 2,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(24,119,242,0.1)',
  },
  sourceText: { fontSize: 12, fontWeight: '700', color: FB_BLUE },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  meta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, marginLeft: 4, fontWeight: '500', color: colors.textMuted },
  postText: {
    marginTop: spacing.md,
    fontSize: 13.5,
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: 19,
  },
  note: {
    marginTop: spacing.md,
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: FB_BLUE,
  },
  viewBtnText: { fontSize: 14, fontWeight: '700', color: FB_BLUE },
});

export default ExternalRideCard;
