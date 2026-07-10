import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CalendarModal from '../components/CalendarModal';
import Screen from '../components/ui/Screen';
import ScreenHeader from '../components/ui/ScreenHeader';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import EmptyState from '../components/ui/EmptyState';
import ListOptions from '../components/ListOptions';
import RideCard from '../components/RideCard';
import ExternalRideCard from '../components/ExternalRideCard';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import {
  subscribeUpcomingRides,
  searchRides,
  seatsLeft,
  rideTypeOf,
  isFreeRide,
  dateRangeFor,
} from '../services/rides';
import { subscribeExternalRides, isExternalRide } from '../services/external';
import { bookRide, subscribeUserBookings } from '../services/bookings';
import { colors, spacing, radius } from '../theme';

// Local date, not toISOString (UTC) — Georgia is UTC+4, so UTC would shift
// a calendar-picked date back a day around midnight.
const formatDate = (d) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`
    : '';

const COLLAPSE_SCROLL_Y = 48;

const FindScreen = ({ navigation }) => {
  const { t } = useLocale();
  const { user, profile } = useAuth();
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [when, setWhen] = useState('any'); // any | today | tomorrow | week | date
  const [date, setDate] = useState(null);
  const [typeFilter, setTypeFilter] = useState(''); // '' | carpool | bus
  const [priceFilter, setPriceFilter] = useState(''); // '' | free | paid
  const [pickerVisible, setPickerVisible] = useState(false);
  const [rides, setRides] = useState([]);
  const [external, setExternal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchFormExpanded, setSearchFormExpanded] = useState(true);
  const [bookedIds, setBookedIds] = useState([]);
  const [bookingId, setBookingId] = useState(null);
  const [formHeight, setFormHeight] = useState(0);
  const heightAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Scoped Animated-driven accordion instead of LayoutAnimation — the latter
  // re-lays out the *entire* screen (header, list, everything) on every
  // toggle, which is what made it feel laggy. Here only this one container
  // animates: opacity/slide/chevron are native-driven (buttery), height is
  // JS-driven since RN's native driver can't animate layout props, but it's
  // scoped to a single small view instead of the whole tree.
  //
  // Motion: Material-standard cubic-bezier(0.4, 0, 0.2, 1); closing is a bit
  // quicker than opening (220 vs 280ms), which reads as snappy-but-gentle.
  useEffect(() => {
    const toValue = searchFormExpanded ? 1 : 0;
    const duration = searchFormExpanded ? 280 : 220;
    const easing = Easing.bezier(0.4, 0, 0.2, 1);
    Animated.parallel([
      Animated.timing(heightAnim, { toValue, duration, easing, useNativeDriver: false }),
      Animated.timing(opacityAnim, { toValue, duration, easing, useNativeDriver: true }),
    ]).start();
  }, [searchFormExpanded, heightAnim, opacityAnim]);

  const formClipHeight = formHeight
    ? heightAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, formHeight],
        extrapolate: 'clamp',
      })
    : undefined;

  // Content slides up slightly as it fades (native-driven), so the form reads
  // as tucking under the header rather than just squashing.
  const contentSlide = opacityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 0],
  });

  // Chevron rotates smoothly instead of swapping icons.
  const chevronRotate = opacityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg'],
  });

  // --- Drag-to-collapse on the card itself -------------------------------
  // Swiping up on the expanded form collapses it interactively (it follows
  // the finger); swiping down on the collapsed bar expands it. Taps still
  // work — the responder only claims clearly-vertical moves past 10px.
  // Refs mirror the latest state because the PanResponder is created once.
  const expandedRef = useRef(true);
  useEffect(() => {
    expandedRef.current = searchFormExpanded;
  }, [searchFormExpanded]);
  const formHeightRef = useRef(0);

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const settleTo = (target) => {
    if (target === expandedRef.current) {
      // Same state as before the drag — spring back to the resting position
      // manually, since the state effect won't re-run.
      const toValue = target ? 1 : 0;
      const easing = Easing.bezier(0.4, 0, 0.2, 1);
      Animated.parallel([
        Animated.timing(heightAnim, { toValue, duration: 180, easing, useNativeDriver: false }),
        Animated.timing(opacityAnim, { toValue, duration: 180, easing, useNativeDriver: true }),
      ]).start();
    } else {
      setSearchFormExpanded(target); // the effect animates from the current position
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        const vertical = Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5;
        if (!vertical || !formHeightRef.current) return false;
        // Only claim the direction that makes sense for the current state.
        return expandedRef.current ? g.dy < 0 : g.dy > 0;
      },
      onPanResponderMove: (_, g) => {
        const h = formHeightRef.current;
        if (!h) return;
        const base = expandedRef.current ? 1 : 0;
        const progress = clamp01(base + g.dy / h);
        heightAnim.setValue(progress);
        opacityAnim.setValue(progress);
      },
      onPanResponderRelease: (_, g) => {
        const h = formHeightRef.current || 1;
        const base = expandedRef.current ? 1 : 0;
        const progress = clamp01(base + g.dy / h);
        // Fast flicks win regardless of distance; otherwise snap to nearest.
        let target;
        if (g.vy < -0.35) target = false;
        else if (g.vy > 0.35) target = true;
        else target = progress > 0.5;
        settleTo(target);
      },
      onPanResponderTerminate: () => settleTo(expandedRef.current),
    })
  ).current;

  const whenOptions = [
    { key: 'any', label: t('common.anyDate') },
    { key: 'today', label: t('find.dateToday') },
    { key: 'tomorrow', label: t('find.dateTomorrow') },
    { key: 'week', label: t('find.dateWeek') },
    { key: 'date', label: t('find.datePick') },
  ];

  const formatDateLabel = () => {
    if (when === 'date' && date) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return whenOptions.find((o) => o.key === when)?.label || t('common.anyDate');
  };

  const selectWhen = (key) => {
    setWhen(key);
    if (key === 'date') setPickerVisible(true);
    else setDate(null);
  };

  useEffect(() => {
    if (searching) return undefined;
    setLoading(true);
    const unsub = subscribeUpcomingRides((data) => {
      setRides(data);
      setLoading(false);
    });
    return unsub;
  }, [searching]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeUserBookings(user.uid, setBookedIds);
  }, [user]);

  // External (Facebook-sourced) rides stream continuously alongside the real
  // feed, windowed to the same two weeks. They're filtered client-side below.
  useEffect(() => subscribeExternalRides(setExternal), []);

  const handleSearch = () => {
    // Collapse first (animated via the effect above), and defer the heavy
    // work — network fetch, list swap, re-render — until the collapse has had
    // its frames. The height animation is JS-driven, so doing both at once
    // starves it and drops frames.
    setSearchFormExpanded(false);
    setTimeout(async () => {
      setSearching(true);
      setLoading(true);
      try {
        const results = await searchRides({ departure, destination, when, date: formatDate(date) });
        setRides(results);
      } catch {
        setRides([]);
      } finally {
        setLoading(false);
      }
    }, 240);
  };

  const handleReset = () => {
    setDeparture('');
    setDestination('');
    setWhen('any');
    setDate(null);
    setTypeFilter('');
    setPriceFilter('');
    setSearching(false);
    setSearchFormExpanded(true);
  };

  // Type/price filters apply to whatever is shown — browse feed or search results.
  const visibleRides = rides.filter(
    (r) =>
      (!typeFilter || rideTypeOf(r) === typeFilter) &&
      (!priceFilter || (priceFilter === 'free') === isFreeRide(r))
  );

  // External rides are always carpools with an unknown price, so they only show
  // under "any type"/"carpool" and "any price". While searching, the same
  // route/date filters the real results used are applied to them too.
  const [searchFrom, searchTo] = dateRangeFor(when, formatDate(date));
  const visibleExternal = external.filter((r) => {
    if (typeFilter && typeFilter !== 'carpool') return false;
    if (priceFilter) return false;
    if (searching) {
      if (departure && r.departure?.trim() !== departure.trim()) return false;
      if (destination && r.destination?.trim() !== destination.trim()) return false;
      if (searchFrom && (r.date || '') < searchFrom) return false;
      if (searchTo && (r.date || '') > searchTo) return false;
    }
    return true;
  });

  // Merge real + external into one list, ordered by date then departure time.
  const feedData = [...visibleRides, ...visibleExternal].sort(
    (a, b) =>
      (a.date || '').localeCompare(b.date || '') ||
      (a.departureTime || '').localeCompare(b.departureTime || '')
  );

  const handleBook = useCallback(
    (ride) => {
      if (!profile?.name) {
        Alert.alert(t('find.completeProfileBook'), t('find.addNameBook'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.completeProfile'), onPress: () => navigation.navigate('CompleteProfile') },
        ]);
        return;
      }
      Alert.alert(
        t('find.confirmBooking'),
        t('find.confirmBookingMsg', { from: ride.departure, to: ride.destination }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('find.book'),
            onPress: async () => {
              setBookingId(ride.id);
              try {
                await bookRide(ride, { uid: user.uid, name: profile.name });
                Alert.alert(t('find.bookedAlert'), t('find.bookedAlertSub'));
              } catch (e) {
                Alert.alert(t('find.couldNotBook'), e.message);
              } finally {
                setBookingId(null);
              }
            },
          },
        ]
      );
    },
    [profile, user, navigation, t]
  );

  const renderItem = ({ item }) => {
    if (isExternalRide(item)) return <ExternalRideCard ride={item} />;
    const isOwn = item.localId === user?.uid;
    const isBooked = bookedIds.includes(item.id);
    const full = seatsLeft(item) <= 0;
    return (
      <RideCard
        ride={item}
        onPressDriver={() =>
          navigation.navigate('UserProfile', { userId: item.localId, userName: item.name })
        }
      >
        {isOwn ? (
          <View style={styles.ownTag}>
            <MaterialIcons name="info-outline" size={16} color={colors.textMuted} />
            <Text style={styles.ownText}>{t('find.ownRide')}</Text>
          </View>
        ) : isBooked ? (
          <Button title={t('find.booked')} icon="check-circle" variant="success" disabled />
        ) : (
          <Button
            title={full ? t('find.fullyBooked') : t('find.bookSeat')}
            icon="event-seat"
            onPress={() => handleBook(item)}
            loading={bookingId === item.id}
            disabled={full}
          />
        )}
      </RideCard>
    );
  };

  const handleListScroll = (e) => {
    if (rides.length === 0) return;
    const y = e.nativeEvent.contentOffset.y;
    if (y > COLLAPSE_SCROLL_Y && searchFormExpanded) {
      setSearchFormExpanded(false);
    } else if (y <= COLLAPSE_SCROLL_Y && !searchFormExpanded && !searching) {
      // Re-expand on scroll-to-top only while browsing; after an explicit
      // search we keep it collapsed until the user taps the bar.
      setSearchFormExpanded(true);
    }
  };

  // Tapping the header slides the form open/closed.
  const toggleForm = () => {
    setSearchFormExpanded((v) => !v);
  };

  const resultsLabel = searching
    ? feedData.length === 1
      ? t('find.ridesFound', { n: feedData.length })
      : t('find.ridesFoundPlural', { n: feedData.length })
    : feedData.length === 1
      ? t('find.upcomingCount', { n: feedData.length })
      : t('find.upcomingCountPlural', { n: feedData.length });

  return (
    <Screen flush>
      {/* Static title/subtitle — changing copy above the accordion made the
          whole header area feel unstable while the form animated. */}
      <ScreenHeader icon="search" title={t('find.title')} subtitle={t('find.subtitleBrowse')} />

      <View style={styles.searchWrap} {...panResponder.panHandlers}>
        <TouchableOpacity style={styles.searchHeader} onPress={toggleForm} activeOpacity={0.8}>
          <MaterialIcons name="search" size={20} color={colors.primary} />
          <View style={styles.collapsedTextWrap}>
            {searching || departure || destination ? (
              <>
                <Text style={styles.collapsedRoute} numberOfLines={1}>
                  {departure || t('common.anywhere')} → {destination || t('common.anywhere')}
                </Text>
                <Text style={styles.collapsedMeta}>{formatDateLabel()}</Text>
              </>
            ) : (
              <>
                <Text style={styles.collapsedRoute}>{t('find.upcomingRides')}</Text>
                <Text style={styles.collapsedMeta}>{t('find.available', { n: rides.length })}</Text>
              </>
            )}
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <MaterialIcons name="expand-less" size={24} color={colors.textMuted} />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View
          style={[styles.formClip, formClipHeight !== undefined && { height: formClipHeight }]}
        >
          <Animated.View
            style={{ opacity: opacityAnim, transform: [{ translateY: contentSlide }] }}
            pointerEvents={searchFormExpanded ? 'auto' : 'none'}
          >
            <View
              style={styles.formBody}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                formHeightRef.current = h;
                setFormHeight(h);
              }}
            >
              <View style={styles.routeFields}>
            <ListOptions
              value={departure}
              onValueChange={setDeparture}
              placeholder={t('find.leavingFrom')}
              exclude={destination}
            />
            <ListOptions
              value={destination}
              onValueChange={setDestination}
              placeholder={t('find.goingTo')}
              exclude={departure}
            />
            <TouchableOpacity
              style={styles.swapBtn}
              onPress={() => {
                setDeparture(destination);
                setDestination(departure);
              }}
              hitSlop={8}
              accessibilityLabel={t('find.swap')}
            >
              <MaterialIcons name="swap-vert" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.whenRow}>
            {whenOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.whenChip, when === option.key && styles.whenChipOn]}
                onPress={() => selectWhen(option.key)}
              >
                <Text style={[styles.whenText, when === option.key && styles.whenTextOn]}>
                  {option.key === 'date' && date ? formatDateLabel() : option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterLabel}>{t('find.filterType')}</Text>
          <View style={styles.whenRow}>
            {[
              { key: '', label: t('find.typeAll') },
              { key: 'carpool', label: `🚗 ${t('find.typeCarpool')}` },
              { key: 'bus', label: `🚌 ${t('find.typeBus')}` },
            ].map((option) => (
              <TouchableOpacity
                key={`type-${option.key}`}
                style={[styles.whenChip, typeFilter === option.key && styles.whenChipOn]}
                onPress={() => setTypeFilter(option.key)}
              >
                <Text
                  style={[styles.whenText, typeFilter === option.key && styles.whenTextOn]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterLabel}>{t('find.filterPrice')}</Text>
          <View style={styles.whenRow}>
            {[
              { key: '', label: t('find.priceAll') },
              { key: 'free', label: t('find.priceFree') },
              { key: 'paid', label: t('find.pricePaid') },
            ].map((option) => (
              <TouchableOpacity
                key={`price-${option.key}`}
                style={[styles.whenChip, priceFilter === option.key && styles.whenChipOn]}
                onPress={() => setPriceFilter(option.key)}
              >
                <Text
                  style={[styles.whenText, priceFilter === option.key && styles.whenTextOn]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
            <View style={styles.searchRow}>
              <Button title={t('find.searchRides')} icon="search" onPress={handleSearch} style={styles.searchBtn} />
              {searching ? (
                <Button
                  title={t('find.reset')}
                  variant="secondary"
                  onPress={handleReset}
                  style={styles.resetBtn}
                  fullWidth={false}
                />
              ) : null}
            </View>
          </View>
        </Animated.View>
      </Animated.View>
      </View>

      {loading ? (
        <Loading text={t('find.finding')} />
      ) : (
        <FlatList
          data={feedData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={
            feedData.length ? (
              <View style={styles.resultsHeader}>
                <MaterialIcons name="directions-car" size={18} color={colors.primary} />
                <Text style={styles.count}>{resultsLabel}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            searching ? (
              <View>
                <EmptyState
                  icon="search-off"
                  title={t('find.noRidesFound')}
                  subtitle={t('find.noRidesFoundSub')}
                />
                <View style={styles.requestCta}>
                  <Text style={styles.requestCtaText}>{t('find.postRequestCta')}</Text>
                  <Button
                    title={t('find.postRequest')}
                    icon="add"
                    onPress={() =>
                      navigation.navigate('Requests', {
                        openForm: true,
                        initial: { from: departure, to: destination, date: formatDate(date) || undefined },
                      })
                    }
                  />
                </View>
              </View>
            ) : (
              <EmptyState
                icon="directions-car"
                title={t('find.noUpcoming')}
                subtitle={t('find.noUpcomingSub')}
              />
            )
          }
        />
      )}

      <CalendarModal
        visible={pickerVisible}
        value={date ? formatDate(date) : null}
        onSelect={(dateISO) => setDate(new Date(`${dateISO}T00:00:00`))}
        onClose={() => setPickerVisible(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchWrap: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  // Clipping mask for the accordion — height is animated, overflow hidden so
  // content is visually cut off rather than pushing the layout around.
  formClip: {
    overflow: 'hidden',
  },
  formBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  collapsedTextWrap: { flex: 1 },
  collapsedRoute: { fontSize: 15, fontWeight: '700', color: colors.text },
  collapsedMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  routeFields: {
    position: 'relative',
  },
  swapBtn: {
    position: 'absolute',
    right: 14,
    // Fields are 48 high with a 16 gap → boundary midpoint at y=56, minus half
    // the 36px button = 38, so the circle sits exactly on the seam.
    top: 38,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  whenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  filterLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textFaint,
    marginBottom: spacing.sm,
  },
  whenChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  whenChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  whenText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  whenTextOn: { color: colors.primary },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBtn: { flex: 1 },
  resetBtn: { marginLeft: spacing.md, paddingHorizontal: spacing.lg },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  count: { fontSize: 15, color: colors.text, fontWeight: '700' },
  requestCta: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  requestCtaText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  ownTag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ownText: { marginLeft: 6, color: colors.textMuted, fontSize: 14 },
});

export default FindScreen;
