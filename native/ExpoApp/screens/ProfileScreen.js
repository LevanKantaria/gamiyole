import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Alert, TouchableOpacity, Linking, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/ui/Screen';
import ScreenHeader from '../components/ui/ScreenHeader';
import SectionTitle from '../components/ui/SectionTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import StarRating from '../components/ui/StarRating';
import LanguageToggle from '../components/LanguageToggle';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeRatingSummary } from '../services/ratings';
import { getUserRideStats } from '../services/rides';
import {
  NOTIFICATION_TYPES,
  subscribeNotificationPrefs,
  setNotificationPref,
} from '../services/notifications';
import { colors, spacing, radius, DEFAULT_AVATAR } from '../theme';

const ProfileScreen = ({ navigation }) => {
  const { t } = useLocale();
  const { user, profile, profileComplete, isDriver, signOut, pushStatus } = useAuth();
  const [ratings, setRatings] = useState({ average: 0, count: 0, reviews: [] });
  const [stats, setStats] = useState({ publishedRides: 0, completedRides: 0, activeRides: 0 });
  const [notifPrefs, setNotifPrefs] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeRatingSummary(user.uid, setRatings);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeNotificationPrefs(user.uid, setNotifPrefs);
  }, [user]);

  const toggleNotif = (type, enabled) => {
    // Optimistic — the subscription will reconcile.
    setNotifPrefs((prev) => ({ ...prev, [type]: enabled }));
    setNotificationPref(user.uid, type, enabled).catch(() => {});
  };

  useFocusEffect(
    useCallback(() => {
      if (user) getUserRideStats(user.uid).then(setStats);
    }, [user])
  );

  const handleLogout = () =>
    Alert.alert(t('profile.logOut'), t('profile.logOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logOut'), style: 'destructive', onPress: signOut },
    ]);

  if (!profile) return <Loading text={t('profile.loadingProfile')} />;

  return (
    <Screen scroll flush>
      <ScreenHeader
        icon="person"
        title={profileComplete ? profile.name : t('profile.yourProfile')}
        subtitle={
          profileComplete
            ? isDriver
              ? t('profile.driverAccount')
              : t('profile.passengerAccount')
            : t('profile.completeToStart')
        }
      />
      <View style={styles.body}>
        <Card style={styles.headerCard}>
          <View style={styles.avatarRing}>
            <Image source={{ uri: profile.image || DEFAULT_AVATAR }} style={styles.avatar} />
          </View>

          {!profileComplete ? (
            <View style={styles.welcome}>
              <Text style={styles.name}>{t('profile.welcome')}</Text>
              <Text style={styles.muted}>{t('profile.welcomeSub')}</Text>
              <Button
                title={t('profile.completeProfile')}
                icon="edit"
                onPress={() => navigation.navigate('CompleteProfile')}
                style={styles.topGap}
              />
            </View>
          ) : (
            <>
              <Text style={styles.name}>{profile.name}</Text>
              {profile.age ? (
                <Text style={styles.muted}>{t('common.yearsOld', { n: profile.age })}</Text>
              ) : null}
              <View style={styles.badge}>
                <MaterialIcons
                  name={isDriver ? 'directions-car' : 'person'}
                  size={15}
                  color={colors.primary}
                />
                <Text style={styles.badgeText}>
                  {isDriver ? t('common.driver') : t('common.passenger')}
                </Text>
              </View>
              <View style={styles.ratingRow}>
                <StarRating value={ratings.average} size={18} />
                <Text style={styles.ratingText}>
                  {ratings.average ? ratings.average.toFixed(1) : t('profile.noRatings')}
                  {ratings.count ? ` (${ratings.count})` : ''}
                </Text>
              </View>
              <Button
                title={t('profile.editProfile')}
                variant="secondary"
                icon="edit"
                onPress={() => navigation.navigate('CompleteProfile')}
                style={styles.topGap}
              />
            </>
          )}
        </Card>

        <Card style={styles.section}>
          <SectionTitle icon="language" title={t('profile.language')} subtitle={t('profile.languageSub')} />
          <LanguageToggle />
        </Card>

        <Card style={styles.section}>
          <SectionTitle
            icon="notifications"
            title={t('notifications.title')}
            subtitle={t('notifications.subtitle')}
          />
          {pushStatus ? (
            <View
              style={[
                styles.pushStatus,
                pushStatus.status === 'ok' ? styles.pushStatusOk : styles.pushStatusWarn,
              ]}
            >
              <MaterialIcons
                name={pushStatus.status === 'ok' ? 'check-circle' : 'error-outline'}
                size={16}
                color={pushStatus.status === 'ok' ? colors.success : colors.danger}
              />
              <Text style={styles.pushStatusText}>
                {t(`notifications.status_${pushStatus.status}`)}
                {pushStatus.status === 'error' && pushStatus.error ? `  (${pushStatus.error})` : ''}
              </Text>
            </View>
          ) : null}
          {NOTIFICATION_TYPES.map((type, i) => (
            <View key={type} style={[styles.notifRow, i > 0 && styles.notifRowBorder]}>
              <View style={styles.notifText}>
                <Text style={styles.notifLabel}>{t(`notifications.${type}`)}</Text>
                <Text style={styles.notifSub}>{t(`notifications.${type}Sub`)}</Text>
              </View>
              <Switch
                value={notifPrefs ? notifPrefs[type] : true}
                onValueChange={(v) => toggleNotif(type, v)}
                disabled={!notifPrefs}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.white}
              />
            </View>
          ))}
        </Card>

        {profileComplete ? (
          <>
            <Card style={styles.section}>
              <SectionTitle icon="insights" title={t('common.activity')} subtitle={t('profile.activitySub')} />
              <View style={styles.stats}>
                <Stat icon="directions-car" label={t('profile.published')} value={stats.publishedRides} color={colors.success} />
                <Stat icon="check-circle" label={t('profile.completed')} value={stats.completedRides} color={colors.warning} />
                <Stat icon="schedule" label={t('profile.active')} value={stats.activeRides} color={colors.primary} />
              </View>
            </Card>

            {profile.aboutMe ? (
              <Card style={styles.section}>
                <SectionTitle icon="face" title={t('common.aboutMe')} />
                <Text style={styles.profileText}>{profile.aboutMe}</Text>
              </Card>
            ) : null}

            <Card style={styles.section}>
              <SectionTitle icon="contact-mail" title={t('common.contact')} />
              <Row icon="email" text={user?.email} />
              {profile.number ? <Row icon="phone" text={profile.number} /> : null}
              {isDriver && profile.model ? <Row icon="directions-car" text={profile.model} /> : null}
              {isDriver && profile.plate ? (
                <Row icon="confirmation-number" text={t('common.plate', { plate: profile.plate })} />
              ) : null}
            </Card>

            {ratings.reviews.length ? (
              <Card style={styles.section}>
                <SectionTitle icon="star" title={t('common.reviews')} />
                {ratings.reviews.map((r, i) => (
                  <View key={i} style={[styles.review, i > 0 && styles.reviewBorder]}>
                    <View style={styles.reviewHead}>
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('UserProfile', { userId: r.ratedBy, userName: r.ratedByName })
                        }
                      >
                        <Text style={styles.reviewer}>{r.ratedByName || t('common.anonymous')}</Text>
                      </TouchableOpacity>
                      <StarRating value={r.rating} size={14} />
                    </View>
                    <Text style={styles.profileText}>{r.comment}</Text>
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        ) : null}

        <Button
          title={t('profile.logOut')}
          variant="danger"
          icon="logout"
          onPress={handleLogout}
          style={styles.logout}
        />

        <TouchableOpacity
          style={styles.privacyLink}
          onPress={() => Linking.openURL('https://www.gamiyole.me/privacy')}
        >
          <Text style={styles.privacyText}>{t('profile.privacyPolicy')}</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const Stat = ({ icon, label, value, color }) => (
  <View style={styles.stat}>
    <MaterialIcons name={icon} size={22} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Row = ({ icon, text }) => (
  <View style={styles.row}>
    <MaterialIcons name={icon} size={18} color={colors.textMuted} />
    <Text style={styles.rowText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingTop: spacing.sm },
  headerCard: { alignItems: 'center', marginTop: -spacing.md },
  avatarRing: {
    padding: 4,
    borderRadius: 56,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.white,
  },
  welcome: { alignItems: 'center', marginTop: spacing.lg },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  muted: { fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  badgeText: { marginLeft: 6, fontSize: 13, fontWeight: '700', color: colors.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  ratingText: { marginLeft: spacing.sm, color: colors.textMuted, fontWeight: '600' },
  topGap: { marginTop: spacing.lg },
  section: { marginTop: spacing.lg },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minWidth: 90,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 4 },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  profileText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  rowText: { marginLeft: spacing.md, fontSize: 15, color: colors.text },
  review: { paddingVertical: spacing.md },
  reviewBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewer: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  pushStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  pushStatusOk: { backgroundColor: colors.successLight },
  pushStatusWarn: { backgroundColor: colors.dangerLight },
  pushStatusText: { flex: 1, fontSize: 12.5, color: colors.text },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  notifRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  notifText: { flex: 1 },
  notifLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  notifSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  logout: { marginTop: spacing.xl },
  privacyLink: { alignSelf: 'center', marginTop: spacing.lg, padding: spacing.sm },
  privacyText: { fontSize: 13, color: colors.textMuted, textDecorationLine: 'underline' },
});

export default ProfileScreen;
