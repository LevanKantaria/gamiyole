import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Card from './ui/Card';
import { useLocale } from '../context/LocaleContext';
import { colors, spacing, radius } from '../theme';
import { seatsLeft, RIDE_STATUS } from '../services/rides';
import { getProfileImage } from '../services/profile';
import { getRatingSummary } from '../services/ratings';
import { getVerifiedSet } from '../services/verification';
import { BADGE_ICONS } from '../constants/rideBadges';
import VerifiedBadge from './VerifiedBadge';

// Avatar/rating lookups cached per driver so a list of rides by the same
// driver doesn't refetch for every card (same approach as the web app).
const driverInfoCache = new Map();
const getDriverInfo = (uid) => {
  if (!driverInfoCache.has(uid)) {
    driverInfoCache.set(
      uid,
      Promise.all([getProfileImage(uid), getRatingSummary(uid), getVerifiedSet()])
        .then(([avatar, rating, verifiedSet]) => ({
          avatar,
          rating,
          verified: verifiedSet.has(uid),
        }))
        .catch(() => ({ avatar: null, rating: { average: 0, count: 0 }, verified: false }))
    );
  }
  return driverInfoCache.get(uid);
};

const RideCard = ({ ride, onPressDriver, children, showStatus = false }) => {
  const { t } = useLocale();
  const left = seatsLeft(ride);
  const badges = Array.isArray(ride.badges)
    ? ride.badges.filter((key) => BADGE_ICONS[key])
    : [];

  const [driver, setDriver] = useState({ avatar: null, rating: null });
  useEffect(() => {
    let mounted = true;
    if (!ride.localId) return undefined;
    getDriverInfo(ride.localId).then((info) => {
      if (mounted) setDriver(info);
    });
    return () => {
      mounted = false;
    };
  }, [ride.localId]);

  const statusLabels = {
    [RIDE_STATUS.COMPLETED]: { label: t('rideCard.completed'), color: colors.textMuted, bg: colors.surfaceAlt },
    [RIDE_STATUS.CANCELLED]: { label: t('rideCard.cancelled'), color: colors.danger, bg: colors.dangerLight },
  };
  const badge = statusLabels[ride.status];

  return (
    <View style={styles.cardWrap}>
      <View style={styles.accent} />
      <Card style={styles.card}>
        <View style={styles.routeRow}>
          <View style={styles.routeCol}>
            <View style={styles.cityRow}>
              <MaterialIcons name="trip-origin" size={16} color={colors.primary} />
              <Text style={styles.city} numberOfLines={1}>{ride.departure}</Text>
            </View>
            <View style={styles.connector} />
            <View style={styles.cityRow}>
              <MaterialIcons name="location-on" size={16} color={colors.danger} />
              <Text style={styles.city} numberOfLines={1}>{ride.destination}</Text>
            </View>
          </View>
          <View style={styles.priceBox}>
            {Number(ride.price) === 0 ? (
              <Text style={styles.price}>{t('common.free')}</Text>
            ) : (
              <>
                <Text style={styles.price}>{ride.price}</Text>
                <Text style={styles.priceUnit}>GEL</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.metaRow}>
          {ride.rideType === 'bus' ? (
            <Meta icon="directions-bus" text={t('rideCard.bus')} color={colors.primary} />
          ) : null}
          <Meta icon="event" text={ride.date} />
          <Meta icon="schedule" text={ride.departureTime || '—'} />
          <Meta
            icon="airline-seat-recline-normal"
            text={t('rideCard.seatsLeft', { n: left })}
            color={left <= 0 ? colors.danger : colors.textMuted}
          />
        </View>

        {badges.length > 0 ? (
          <View style={styles.badgesRow}>
            {badges.map((key) => (
              <View key={key} style={styles.prefChip}>
                <MaterialIcons name={BADGE_ICONS[key]} size={13} color={colors.primary} />
                <Text style={styles.prefText}>{t(`badges.${key}`)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {ride.comment ? (
          <Text style={styles.comment} numberOfLines={2}>
            “{ride.comment}”
          </Text>
        ) : null}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.driver}
            onPress={onPressDriver}
            disabled={!onPressDriver}
          >
            {driver.avatar ? (
              <Image source={{ uri: driver.avatar }} style={styles.driverAvatar} />
            ) : (
              <MaterialIcons name="account-circle" size={26} color={colors.textMuted} />
            )}
            <View style={styles.driverInfo}>
              <View style={styles.driverNameRow}>
                <Text style={styles.driverName} numberOfLines={1}>
                  {ride.name || t('common.driver')}
                </Text>
                {driver.verified ? <VerifiedBadge size={14} /> : null}
              </View>
              {driver.rating && driver.rating.count > 0 ? (
                <View style={styles.driverRating}>
                  <MaterialIcons name="star" size={12} color="#f59e0b" />
                  <Text style={styles.driverRatingText}>
                    {driver.rating.average} ({driver.rating.count})
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
          {showStatus && badge ? (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          ) : null}
        </View>

        {children ? <View style={styles.actions}>{children}</View> : null}
      </Card>
    </View>
  );
};

const Meta = ({ icon, text, color = colors.textMuted }) => (
  <View style={styles.meta}>
    <MaterialIcons name={icon} size={15} color={color} />
    <Text style={[styles.metaText, { color }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  cardWrap: { marginBottom: spacing.lg, flexDirection: 'row' },
  accent: {
    width: 4,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    marginRight: -2,
  },
  card: { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  routeCol: { flex: 1, paddingRight: spacing.md },
  cityRow: { flexDirection: 'row', alignItems: 'center' },
  city: { fontSize: 17, fontWeight: '700', color: colors.text, marginLeft: spacing.sm, flexShrink: 1 },
  connector: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
    marginLeft: 7,
    marginVertical: 2,
  },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 22, fontWeight: '800', color: colors.success },
  priceUnit: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    justifyContent: 'space-between',
  },
  meta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, marginLeft: 4, fontWeight: '500' },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
  },
  prefChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prefText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  comment: {
    marginTop: spacing.md,
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  driver: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  driverAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
  },
  driverInfo: { marginLeft: 6, flexShrink: 1 },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  driverName: { color: colors.primary, fontWeight: '600', fontSize: 14, flexShrink: 1 },
  driverRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  driverRatingText: { fontSize: 11.5, color: colors.textMuted, fontWeight: '600' },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontSize: 12, fontWeight: '700' },
  actions: { marginTop: spacing.lg },
});

export default RideCard;
