import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Card from './ui/Card';
import { useLocale } from '../context/LocaleContext';
import { cityLabel } from '../constants/cities';
import { MONTHS } from '../i18n/translations';
import { getProfile, getProfileImage } from '../services/profile';
import { getVerifiedSet } from '../services/verification';
import { deleteRequest } from '../services/requests';
import VerifiedBadge from './VerifiedBadge';
import { colors, spacing, radius } from '../theme';

const infoCache = new Map();
const getInfo = (uid) => {
  if (!infoCache.has(uid)) {
    infoCache.set(
      uid,
      Promise.all([getProfileImage(uid), getProfile(uid), getVerifiedSet()])
        .then(([avatar, profile, verifiedSet]) => ({
          avatar,
          number: profile?.number || null,
          verified: verifiedSet.has(uid),
        }))
        .catch(() => ({ avatar: null, number: null, verified: false }))
    );
  }
  return infoCache.get(uid);
};

const dayMonth = (iso, lang) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
};

const RequestCard = ({ request, currentUid, onPressPassenger, onDeleted }) => {
  const { t, isGeorgian } = useLocale();
  const lang = isGeorgian ? 'GE' : 'EN';
  const [info, setInfo] = useState({ avatar: null, number: null });
  const isMine = currentUid === request.passengerUid;

  useEffect(() => {
    let mounted = true;
    getInfo(request.passengerUid).then((i) => mounted && setInfo(i));
    return () => {
      mounted = false;
    };
  }, [request.passengerUid]);

  const dateText =
    request.dateFrom === request.dateTo
      ? dayMonth(request.dateFrom, lang)
      : `${dayMonth(request.dateFrom, lang)} – ${dayMonth(request.dateTo, lang)}`;

  const confirmDelete = () => {
    Alert.alert(t('requests.deleteTitle'), t('requests.deleteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('requests.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteRequest(request.id);
          onDeleted?.();
        },
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.route}>
          <Text style={styles.city} numberOfLines={1}>
            {cityLabel(request.from, isGeorgian)}
          </Text>
          <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
          <Text style={styles.city} numberOfLines={1}>
            {cityLabel(request.to, isGeorgian)}
          </Text>
        </View>
        {isMine ? (
          <View style={styles.mineBadge}>
            <Text style={styles.mineText}>{t('requests.yourRequest')}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.dates}>
        <MaterialIcons name="event" size={15} color={colors.textMuted} />
        <Text style={styles.datesText}>{dateText}</Text>
      </View>

      {request.note ? <Text style={styles.note}>{request.note}</Text> : null}

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.passenger}
          onPress={onPressPassenger}
          disabled={!onPressPassenger}
        >
          {info.avatar ? (
            <Image source={{ uri: info.avatar }} style={styles.avatar} />
          ) : (
            <MaterialIcons name="account-circle" size={30} color={colors.textMuted} />
          )}
          <Text style={styles.name} numberOfLines={1}>
            {request.name}
          </Text>
          {info.verified ? <VerifiedBadge size={14} /> : null}
        </TouchableOpacity>

        {isMine ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Text style={styles.deleteText}>{t('requests.delete')}</Text>
          </TouchableOpacity>
        ) : info.number ? (
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL(`tel:${info.number}`)}
          >
            <MaterialIcons name="phone" size={15} color={colors.white} />
            <Text style={styles.contactText}>{t('requests.contact')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  city: { fontSize: 16, fontWeight: '800', color: colors.text, flexShrink: 1 },
  mineBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  mineText: { fontSize: 12, fontWeight: '700', color: colors.success },
  dates: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  datesText: { fontSize: 13.5, fontWeight: '600', color: colors.textMuted },
  note: { marginTop: spacing.sm, fontSize: 14, lineHeight: 20, color: colors.text },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  passenger: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceAlt },
  name: { fontSize: 14, fontWeight: '700', color: colors.primary, flexShrink: 1 },
  deleteBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
  },
  deleteText: { fontSize: 13.5, fontWeight: '700', color: colors.danger },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  contactText: { fontSize: 13.5, fontWeight: '700', color: colors.white },
});

export default RequestCard;
