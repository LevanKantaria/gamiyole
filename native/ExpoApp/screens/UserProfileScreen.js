import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  StatusBar,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/ui/Card';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import StarRating from '../components/ui/StarRating';
import RatingModal from '../components/RatingModal';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import RideCard from '../components/RideCard';
import { getProfile, getProfileImage, getCarPhotos } from '../services/profile';
import { subscribeRatingSummary, getMyRatingFor, getLegacyComments } from '../services/ratings';
import { isVerified } from '../services/verification';
import VerifiedBadge from '../components/VerifiedBadge';
import { subscribeUserRides, todayISO, RIDE_STATUS } from '../services/rides';
import { colors, spacing, radius, DEFAULT_AVATAR } from '../theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const UserProfileScreen = ({ route, navigation }) => {
  const { t } = useLocale();
  const { userId, userName } = route.params;
  const { user, profile: myProfile } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState({ average: 0, count: 0, reviews: [] });
  const [legacyReviews, setLegacyReviews] = useState([]);
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [myRating, setMyRating] = useState(null);
  const [ratingModal, setRatingModal] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, image, carPhotos, mine, legacy, verified] = await Promise.all([
      getProfile(userId),
      getProfileImage(userId),
      getCarPhotos(userId),
      user ? getMyRatingFor(userId, user.uid) : Promise.resolve(null),
      getLegacyComments(userId).catch(() => []),
      isVerified(userId),
    ]);
    setData({
      name: p?.name || userName || t('userProfile.unknownUser'),
      aboutMe: p?.aboutMe || t('userProfile.noProfileInfo'),
      userType: p?.userType || 'passenger',
      age: p?.age,
      model: p?.model,
      plate: p?.plate,
      number: p?.number,
      email: p?.email,
      facebook: p?.facebook,
      verified,
      image: image || DEFAULT_AVATAR,
      carPhotos,
    });
    setMyRating(mine);
    setLegacyReviews(legacy);
    setLoading(false);
  }, [userId, userName, user, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => subscribeRatingSummary(userId, setRatings), [userId]);

  useEffect(
    () =>
      subscribeUserRides(userId, (rides) =>
        setUpcomingRides(
          rides
            .filter((r) => r.status !== RIDE_STATUS.CANCELLED && (r.date || '') >= todayISO())
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .slice(0, 5)
        )
      ),
    [userId]
  );

  const isOwnProfile = user?.uid === userId;
  const isDriver = data?.userType === 'driver';

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <Loading text={t('userProfile.loading')} />
      </SafeAreaView>
    );
  }

  const ratingSummary = ratings.average
    ? `${ratings.average.toFixed(1)}${ratings.count ? ` · ${t('userProfile.reviewsCount', { n: ratings.count })}` : ''}`
    : t('userProfile.noRatingsYet');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.decor1} />
          <View style={styles.decor2} />
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <View style={styles.avatarRing}>
              <Image source={{ uri: data.image }} style={styles.avatar} />
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{data.name}</Text>
              {data.verified ? <VerifiedBadge size={22} color={colors.white} /> : null}
            </View>
            {data.age ? (
              <Text style={styles.ageText}>{t('common.yearsOld', { n: data.age })}</Text>
            ) : null}
            <View style={styles.typeBadge}>
              <MaterialIcons
                name={isDriver ? 'directions-car' : 'person'}
                size={14}
                color={colors.primary}
              />
              <Text style={styles.typeText}>
                {isDriver ? t('common.driver') : t('common.passenger')}
              </Text>
            </View>
            <View style={styles.ratingRow}>
              <StarRating value={ratings.average} size={18} />
              <Text style={styles.ratingText}>{ratingSummary}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Card>
            <SectionTitle icon="info" title={t('common.about')} />
            <Text style={styles.bodyText}>{data.aboutMe}</Text>
          </Card>

          {data.number || data.facebook ? (
            <Card style={styles.sectionCard}>
              <SectionTitle icon="contact-phone" title={t('common.contact')} />
              {data.number ? (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => Linking.openURL(`tel:${data.number}`)}
                >
                  <MaterialIcons name="phone" size={18} color={colors.primary} />
                  <Text style={[styles.rowText, styles.phoneText]}>{data.number}</Text>
                </TouchableOpacity>
              ) : null}
              {data.facebook ? (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => Linking.openURL(data.facebook)}
                >
                  <MaterialIcons name="facebook" size={18} color="#1877f2" />
                  <Text style={[styles.rowText, styles.fbText]}>{t('common.viewFacebook')}</Text>
                </TouchableOpacity>
              ) : null}
            </Card>
          ) : null}

          {isDriver && (data.model || data.plate) ? (
            <Card style={styles.sectionCard}>
              <SectionTitle icon="directions-car" title={t('common.vehicle')} />
              {data.model ? <Row icon="directions-car" text={data.model} /> : null}
              {data.plate ? (
                <Row icon="confirmation-number" text={t('common.plate', { plate: data.plate })} />
              ) : null}
            </Card>
          ) : null}

          {isDriver && data.carPhotos.length ? (
            <Card style={styles.sectionCard}>
              <SectionTitle
                icon="photo-library"
                title={t('userProfile.carPhotos')}
                subtitle={t('userProfile.photoCount', { n: data.carPhotos.length })}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {data.carPhotos.map((uri, i) => (
                  <TouchableOpacity key={i} onPress={() => setPhotoIndex(i)} activeOpacity={0.85}>
                    <Image source={{ uri }} style={styles.carPhoto} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          ) : null}

          {ratings.reviews.length || legacyReviews.length ? (
            <Card style={styles.sectionCard}>
              <SectionTitle
                icon="star"
                title={t('common.reviews')}
                subtitle={t('userProfile.reviewsTotal', { n: ratings.count })}
              />
              {[...ratings.reviews, ...legacyReviews].map((r, i) => (
                <View key={i} style={[styles.review, i > 0 && styles.reviewBorder]}>
                  <View style={styles.reviewHead}>
                    <Text style={styles.reviewer}>{r.ratedByName || t('common.anonymous')}</Text>
                    {typeof r.rating === 'number' && r.rating > 0 ? (
                      <StarRating value={r.rating} size={14} />
                    ) : null}
                  </View>
                  <Text style={styles.bodyText}>{r.comment}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {upcomingRides.length ? (
            <View style={styles.ridesSection}>
              <SectionTitle
                icon="directions-car"
                title={t('userProfile.publishedRides')}
                subtitle={t('userProfile.rideCount', { n: upcomingRides.length })}
              />
              {upcomingRides.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </View>
          ) : null}

          {!isOwnProfile ? (
            <Button
              title={
                myRating
                  ? t('userProfile.updateRating')
                  : t('userProfile.rateUser', { name: data.name })
              }
              icon="star"
              variant="secondary"
              onPress={() => setRatingModal(true)}
              style={styles.rateButton}
            />
          ) : null}
        </View>
      </ScrollView>

      <RatingModal
        visible={ratingModal}
        onClose={() => setRatingModal(false)}
        targetUserId={userId}
        targetUserName={data.name}
        rater={{ uid: user?.uid, name: myProfile?.name || user?.email }}
        existing={myRating}
        onSubmitted={() => user && getMyRatingFor(userId, user.uid).then(setMyRating)}
      />

      <Modal visible={photoIndex !== null} transparent animationType="fade" onRequestClose={() => setPhotoIndex(null)}>
        <StatusBar hidden />
        <View style={styles.photoOverlay}>
          <TouchableOpacity style={styles.photoClose} onPress={() => setPhotoIndex(null)} hitSlop={16}>
            <MaterialIcons name="close" size={30} color={colors.white} />
          </TouchableOpacity>
          {photoIndex !== null ? (
            <Image source={{ uri: data.carPhotos[photoIndex] }} style={styles.fullPhoto} resizeMode="contain" />
          ) : null}
          {data.carPhotos.length > 1 ? (
            <View style={styles.photoNav}>
              <TouchableOpacity disabled={photoIndex === 0} onPress={() => setPhotoIndex((i) => i - 1)}>
                <MaterialIcons name="chevron-left" size={40} color={photoIndex === 0 ? colors.textMuted : colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                disabled={photoIndex === data.carPhotos.length - 1}
                onPress={() => setPhotoIndex((i) => i + 1)}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={40}
                  color={photoIndex === data.carPhotos.length - 1 ? colors.textMuted : colors.white}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Row = ({ icon, text }) => (
  <View style={styles.row}>
    <MaterialIcons name={icon} size={18} color={colors.textMuted} />
    <Text style={styles.rowText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: {
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  decor1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -30,
  },
  decor2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 10,
    left: -20,
  },
  back: {
    padding: spacing.md,
    paddingLeft: spacing.lg,
    zIndex: 2,
  },
  heroContent: { alignItems: 'center', paddingHorizontal: spacing.lg },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.white,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
  },
  ageText: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    gap: 4,
  },
  typeText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  ratingText: { marginLeft: spacing.sm, color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 14 },
  body: { padding: spacing.lg, paddingTop: spacing.md },
  sectionCard: { marginTop: spacing.lg },
  bodyText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  rowText: { marginLeft: spacing.md, fontSize: 15, color: colors.text },
  phoneText: { color: colors.primary, fontWeight: '700' },
  fbText: { color: '#1877f2', fontWeight: '700' },
  ridesSection: { marginTop: spacing.lg },
  carPhoto: {
    width: 130,
    height: 100,
    borderRadius: radius.md,
    marginRight: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  review: { paddingVertical: spacing.md },
  reviewBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewer: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  rateButton: { marginTop: spacing.xl },
  photoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  photoClose: { position: 'absolute', top: 50, right: 20, zIndex: 2 },
  fullPhoto: { width: screenWidth, height: screenHeight * 0.7 },
  photoNav: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
});

export default UserProfileScreen;
