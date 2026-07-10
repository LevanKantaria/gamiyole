import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/ui/Screen';
import ScreenHeader from '../components/ui/ScreenHeader';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import EmptyState from '../components/ui/EmptyState';
import RideCard from '../components/RideCard';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeUserRides, cancelRide, completeRide, RIDE_STATUS } from '../services/rides';
import { getUserBookedRides, cancelBooking } from '../services/bookings';
import { colors, spacing, radius } from '../theme';

const TripsScreen = ({ navigation }) => {
  const { t } = useLocale();
  const { user } = useAuth();
  const [tab, setTab] = useState('published');
  const [published, setPublished] = useState([]);
  const [booked, setBooked] = useState([]);
  const [loadingPublished, setLoadingPublished] = useState(true);
  const [loadingBooked, setLoadingBooked] = useState(true);

  const tabs = [
    { key: 'published', label: t('trips.myRides') },
    { key: 'booked', label: t('trips.myBookings') },
  ];

  useEffect(() => {
    if (!user) return undefined;
    return subscribeUserRides(user.uid, (rides) => {
      setPublished(rides);
      setLoadingPublished(false);
    });
  }, [user]);

  const loadBooked = useCallback(async () => {
    if (!user) return;
    setLoadingBooked(true);
    try {
      setBooked(await getUserBookedRides(user.uid));
    } finally {
      setLoadingBooked(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadBooked();
    }, [loadBooked])
  );

  const confirmCancelRide = (ride) =>
    Alert.alert(t('trips.cancelRide'), t('trips.cancelRideMsg'), [
      { text: t('trips.keep'), style: 'cancel' },
      { text: t('trips.cancelRide'), style: 'destructive', onPress: () => cancelRide(ride.id) },
    ]);

  const confirmComplete = (ride) =>
    Alert.alert(t('trips.markCompleted'), t('trips.markCompletedMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('trips.complete'), onPress: () => completeRide(ride.id) },
    ]);

  const confirmCancelBooking = (ride) =>
    Alert.alert(t('trips.cancelBooking'), t('trips.cancelBookingMsg'), [
      { text: t('trips.keep'), style: 'cancel' },
      {
        text: t('trips.cancelBooking'),
        style: 'destructive',
        onPress: async () => {
          await cancelBooking(ride, user.uid);
          loadBooked();
        },
      },
    ]);

  const renderPublished = ({ item }) => {
    const active = item.status === RIDE_STATUS.ACTIVE || !item.status;
    const past = item.date && item.date < new Date().toISOString().slice(0, 10);
    return (
      <RideCard ride={item} showStatus>
        {active && !past ? (
          <View style={styles.actionRow}>
            <Button
              title={t('trips.complete')}
              variant="secondary"
              icon="check"
              onPress={() => confirmComplete(item)}
              style={styles.actionBtn}
            />
            <Button
              title={t('trips.cancel')}
              variant="danger"
              icon="close"
              onPress={() => confirmCancelRide(item)}
              style={styles.actionBtn}
            />
          </View>
        ) : null}
      </RideCard>
    );
  };

  const renderBooked = ({ item }) => (
    <RideCard
      ride={item}
      showStatus
      onPressDriver={() =>
        navigation.navigate('UserProfile', { userId: item.localId, userName: item.name })
      }
    >
      {item.status !== RIDE_STATUS.CANCELLED ? (
        <Button
          title={t('trips.cancelBooking')}
          variant="danger"
          icon="close"
          onPress={() => confirmCancelBooking(item)}
        />
      ) : null}
    </RideCard>
  );

  const isPublished = tab === 'published';
  const loading = isPublished ? loadingPublished : loadingBooked;
  const data = isPublished ? published : booked;

  return (
    <Screen flush>
      <ScreenHeader icon="event-note" title={t('trips.title')} subtitle={t('trips.subtitle')} />
      <View style={styles.tabs}>
        {tabs.map((tabItem) => (
          <TouchableOpacity
            key={tabItem.key}
            style={[styles.tab, tab === tabItem.key && styles.tabActive]}
            onPress={() => setTab(tabItem.key)}
          >
            <Text style={[styles.tabText, tab === tabItem.key && styles.tabTextActive]}>{tabItem.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={isPublished ? renderPublished : renderBooked}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={isPublished ? undefined : loadBooked}
          refreshing={isPublished ? undefined : loadingBooked}
          ListEmptyComponent={
            <EmptyState
              icon={isPublished ? 'directions-car' : 'event-seat'}
              title={isPublished ? t('trips.noRides') : t('trips.noBookings')}
              subtitle={isPublished ? t('trips.noRidesSub') : t('trips.noBookingsSub')}
            />
          }
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  tab: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.surface },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  list: { padding: spacing.lg },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, marginHorizontal: 4 },
});

export default TripsScreen;
