import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import CalendarModal from '../components/CalendarModal';
import Screen from '../components/ui/Screen';
import ScreenHeader from '../components/ui/ScreenHeader';
import InfoBanner from '../components/ui/InfoBanner';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ListOptions from '../components/ListOptions';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { publishRide, isDriverSuspended } from '../services/rides';
import {
  getRoutines,
  createRoutine,
  deleteRoutine,
  pauseRoutine,
  resumeRoutine,
  materializeRoutines,
  addMonthsISO,
} from '../services/routines';
import { RIDE_BADGES } from '../constants/rideBadges';
import { DAYS_SHORT } from '../i18n/translations';
import { subscribeRequests } from '../services/requests';
import RequestCard from '../components/RequestCard';
import { colors, spacing, radius } from '../theme';

// Local date, not toISOString (UTC) — Georgia is UTC+4, so UTC would shift
// a calendar-picked date back a day around midnight.
const formatDate = (d) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`
    : '';
// Explicit 24h HH:MM — toLocaleTimeString is device-locale dependent and can
// produce "2:30 PM", which breaks matching with rides published on the web.
const formatTime = (d) =>
  d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';

// Monday-first display order; values are Date#getDay() indices.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

const PublishScreen = ({ navigation }) => {
  const { t, isGeorgian } = useLocale();
  const { user, profile, isDriver, profileComplete } = useAuth();
  const dayLabels = DAYS_SHORT[isGeorgian ? 'GE' : 'EN'];

  const [mode, setMode] = useState('once');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date());
  const [departureTime, setDepartureTime] = useState(new Date());
  const [days, setDays] = useState([]);
  const [duration, setDuration] = useState(1);
  const [rideType, setRideType] = useState('carpool');
  const [badges, setBadges] = useState([]);
  const [comment, setComment] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('');
  const [picker, setPicker] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [routines, setRoutines] = useState([]);
  const [requests, setRequests] = useState([]);

  const loadRoutines = useCallback(() => {
    if (!user) return;
    getRoutines(user.uid).then(setRoutines).catch(() => {});
  }, [user]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  // Passengers looking for rides — shown so the driver can publish to meet demand.
  useEffect(() => {
    if (!user) return undefined;
    return subscribeRequests((all) =>
      setRequests(all.filter((r) => r.passengerUid !== user.uid))
    );
  }, [user]);

  if (!isDriver) {
    return (
      <Screen flush>
        <ScreenHeader icon="directions-car" title={t('publish.title')} subtitle={t('publish.subtitleGuest')} />
        <View style={styles.passengerWrap}>
          <EmptyState
            icon="directions-car"
            title={t('publish.switchDriver')}
            subtitle={t('publish.switchDriverSub')}
          />
          <Button
            title={t('publish.updateProfile')}
            icon="edit"
            fullWidth={false}
            onPress={() => navigation.navigate('CompleteProfile')}
          />
        </View>
      </Screen>
    );
  }

  const handleConfirm = (selected) => {
    if (picker === 'departureTime') setDepartureTime(selected);
    setPicker(null);
  };

  const toggleDay = (day) =>
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const toggleBadge = (key) =>
    setBadges((prev) => (prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key]));

  const handleSubmit = async () => {
    if (!departure || !destination || !price || !seats) {
      Alert.alert(t('publish.missingInfo'), t('publish.fillRoute'));
      return;
    }
    if (departure === destination) {
      Alert.alert(t('publish.invalidRoute'), t('publish.routeDiff'));
      return;
    }
    if (mode === 'routine' && days.length === 0) {
      Alert.alert(t('publish.missingInfo'), t('publish.pickDays'));
      return;
    }
    if (!profileComplete || !profile?.name) {
      Alert.alert(t('publish.completeProfile'), t('publish.completeBeforePublish'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.completeProfile'), onPress: () => navigation.navigate('CompleteProfile') },
      ]);
      return;
    }

    setSubmitting(true);
    try {
      // Admins can revoke driver access; the database rules enforce this, we
      // just surface a clear message instead of a generic write failure.
      if (await isDriverSuspended(user.uid)) {
        Alert.alert(t('publish.suspended'), t('publish.suspendedSub'));
        return;
      }

      if (mode === 'routine') {
        const routineId = await createRoutine(user.uid, {
          departure,
          destination,
          departureTime: formatTime(departureTime),
          price,
          seats,
          days,
          endDate: addMonthsISO(duration),
          ...(rideType === 'bus' ? { rideType: 'bus' } : {}),
          ...(badges.length ? { badges } : {}),
          ...(comment.trim() ? { comment: comment.trim() } : {}),
        });
        await materializeRoutines(
          user.uid,
          { name: profile.name, number: profile.number },
          routineId
        );
        loadRoutines();
        setDays([]);
        Alert.alert(t('publish.routineSaved'), t('publish.routineSavedSub'));
        return;
      }

      await publishRide(
        user.uid,
        { name: profile.name, number: profile.number },
        {
          departure,
          destination,
          date: formatDate(date),
          departureTime: formatTime(departureTime),
          price,
          seats,
          rideType,
          badges,
          comment,
        }
      );
      Alert.alert(t('publish.published'), t('publish.publishedSub'));
      setDeparture('');
      setDestination('');
      setPrice('');
      setSeats('');
      setBadges([]);
      setComment('');
      setDate(new Date());
      setDepartureTime(new Date());
      navigation.navigate('Trips');
    } catch {
      Alert.alert(t('common.error'), t('publish.publishFail'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRoutine = async (routine) => {
    try {
      if (routine.active) {
        await pauseRoutine(user.uid, routine.id);
      } else {
        await resumeRoutine(user.uid, routine.id, {
          name: profile.name,
          number: profile.number,
        });
      }
      loadRoutines();
    } catch {
      Alert.alert(t('common.error'), t('publish.publishFail'));
    }
  };

  const removeRoutine = (routine) => {
    Alert.alert(t('publish.deleteRoutineTitle'), t('publish.deleteRoutineMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('publish.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRoutine(user.uid, routine.id);
            loadRoutines();
          } catch {
            Alert.alert(t('common.error'), t('publish.publishFail'));
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll flush>
      <ScreenHeader icon="add-road" title={t('publish.title')} subtitle={t('publish.subtitle')} />
      <View style={styles.formWrap}>
        <InfoBanner
          variant={mode === 'routine' ? 'info' : 'warning'}
          text={mode === 'routine' ? t('publish.routineHint') : t('publish.priceBanner')}
        />

        <View style={styles.modeTabs}>
          {['once', 'routine'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeTab, mode === m && styles.modeTabActive]}
              onPress={() => setMode(m)}
            >
              <MaterialIcons
                name={m === 'once' ? 'directions-car' : 'event-repeat'}
                size={16}
                color={mode === m ? colors.primary : colors.textMuted}
              />
              <Text
                style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}
                numberOfLines={1}
              >
                {m === 'once' ? t('publish.modeOnce') : t('publish.modeRoutine')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card>
          <ListOptions
            value={departure}
            onValueChange={setDeparture}
            placeholder={t('find.leavingFrom')}
            zIndex={3000}
            exclude={destination}
          />
          <ListOptions
            value={destination}
            onValueChange={setDestination}
            placeholder={t('find.goingTo')}
            zIndex={2000}
            exclude={departure}
          />

          {mode === 'routine' ? (
            <View style={styles.daysBlock}>
              <Text style={styles.blockLabel}>{t('publish.repeatOn')}</Text>
              <View style={styles.chipRow}>
                {WEEK.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, days.includes(day) && styles.chipOn]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.chipText, days.includes(day) && styles.chipTextOn]}>
                      {dayLabels[day]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.blockLabel}>{t('publish.durationLabel')}</Text>
              <View style={styles.chipRow}>
                {[1, 2, 3].map((months) => (
                  <TouchableOpacity
                    key={months}
                    style={[styles.dayChip, duration === months && styles.chipOn]}
                    onPress={() => setDuration(months)}
                  >
                    <Text style={[styles.chipText, duration === months && styles.chipTextOn]}>
                      {t(`publish.months${months}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.pickerButton} onPress={() => setPicker('date')}>
              <MaterialIcons name="event" size={20} color={colors.textMuted} />
              <Text style={styles.pickerText}>{formatDate(date) || t('publish.selectDate')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.pickerButton} onPress={() => setPicker('departureTime')}>
            <MaterialIcons name="schedule" size={20} color={colors.textMuted} />
            <Text style={styles.pickerText}>{formatTime(departureTime) || t('publish.departs')}</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <Input
              containerStyle={styles.half}
              placeholder={t('publish.priceGel')}
              value={price}
              onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={6}
            />
            <Input
              containerStyle={styles.half}
              placeholder={t('publish.seats')}
              value={seats}
              onChangeText={(v) => setSeats(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <Text style={styles.blockLabel}>{t('publish.rideTypeLabel')}</Text>
          <View style={styles.chipRow}>
            {['carpool', 'bus'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.prefChip, rideType === type && styles.chipOn]}
                onPress={() => setRideType(type)}
              >
                <MaterialIcons
                  name={type === 'carpool' ? 'directions-car' : 'directions-bus'}
                  size={14}
                  color={rideType === type ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.chipText, rideType === type && styles.chipTextOn]}>
                  {type === 'carpool' ? t('find.typeCarpool') : t('find.typeBus')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.blockLabel}>{t('publish.prefs')}</Text>
          <View style={styles.chipRow}>
            {RIDE_BADGES.map((badge) => (
              <TouchableOpacity
                key={badge.key}
                style={[styles.prefChip, badges.includes(badge.key) && styles.chipOn]}
                onPress={() => toggleBadge(badge.key)}
              >
                <MaterialIcons
                  name={badge.icon}
                  size={14}
                  color={badges.includes(badge.key) ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.chipText, badges.includes(badge.key) && styles.chipTextOn]}>
                  {t(`badges.${badge.key}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label={t('publish.commentLabel')}
            placeholder={t('publish.commentPlaceholder')}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={200}
          />

          <Button
            title={mode === 'routine' ? t('publish.saveRoutine') : t('publish.publishRide')}
            icon="check"
            onPress={handleSubmit}
            loading={submitting}
          />
        </Card>

        {routines.length > 0 ? (
          <Card style={styles.routinesCard}>
            <Text style={styles.routinesTitle}>{t('publish.myRoutines')}</Text>
            {routines.map((routine, i) => (
              <View key={routine.id} style={[styles.routineItem, i > 0 && styles.routineBorder]}>
                <View style={styles.routineInfo}>
                  <Text style={styles.routineRoute} numberOfLines={1}>
                    {routine.departure} → {routine.destination}
                  </Text>
                  <Text style={styles.routineMeta}>
                    {WEEK.filter((d) => (routine.days || []).includes(d))
                      .map((d) => dayLabels[d])
                      .join(', ')}{' '}
                    · {routine.departureTime} · {routine.price} GEL
                    {routine.endDate
                      ? isGeorgian
                        ? ` · ${routine.endDate}-მდე`
                        : ` · ${t('publish.untilDate')} ${routine.endDate}`
                      : ''}
                  </Text>
                  <Text style={[styles.routineStatus, { color: routine.active ? colors.success : colors.textMuted }]}>
                    {routine.active ? t('publish.active') : t('publish.paused')}
                  </Text>
                </View>
                <View style={styles.routineActions}>
                  <TouchableOpacity style={styles.routineAction} onPress={() => toggleRoutine(routine)} hitSlop={6}>
                    <MaterialIcons
                      name={routine.active ? 'pause-circle-outline' : 'play-circle-outline'}
                      size={22}
                      color={colors.primary}
                    />
                    <Text style={styles.routineActionText}>
                      {routine.active ? t('publish.pause') : t('publish.resume')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.routineAction} onPress={() => removeRoutine(routine)} hitSlop={6}>
                    <MaterialIcons name="delete-outline" size={22} color={colors.danger} />
                    <Text style={[styles.routineActionText, { color: colors.danger }]}>
                      {t('publish.delete')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {requests.length > 0 ? (
          <View style={styles.demand}>
            <View style={styles.demandHead}>
              <Text style={styles.demandTitle}>{t('requests.passengersLooking')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Requests')}>
                <Text style={styles.demandLink}>{t('requests.viewAll')}</Text>
              </TouchableOpacity>
            </View>
            {requests.slice(0, 3).map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                currentUid={user?.uid}
                onPressPassenger={() =>
                  navigation.navigate('UserProfile', {
                    userId: request.passengerUid,
                    userName: request.name,
                  })
                }
              />
            ))}
          </View>
        ) : null}
      </View>

      <CalendarModal
        visible={picker === 'date'}
        value={formatDate(date)}
        onSelect={(dateISO) => setDate(new Date(`${dateISO}T00:00:00`))}
        onClose={() => setPicker(null)}
      />

      <DateTimePickerModal
        isVisible={picker === 'departureTime'}
        mode="time"
        date={new Date()}
        onConfirm={handleConfirm}
        onCancel={() => setPicker(null)}
        is24Hour
        // Force light spinner colors: in iOS dark mode the default renders
        // white text on a white modal, making the picker look empty.
        {...(Platform.OS === 'ios'
          ? { display: 'spinner', textColor: '#111827', themeVariant: 'light' }
          : {})}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  formWrap: { padding: spacing.lg, paddingTop: spacing.sm },
  passengerWrap: { padding: spacing.lg, alignItems: 'center' },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.lg,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  modeTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabText: { fontSize: 13.5, fontWeight: '700', color: colors.textMuted, flexShrink: 1 },
  modeTabTextActive: { color: colors.primary },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  pickerText: { fontSize: 16, color: colors.text, marginLeft: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  daysBlock: { marginBottom: spacing.lg },
  blockLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  dayChip: {
    minWidth: 46,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  prefChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  chipTextOn: { color: colors.primary },
  routinesCard: { marginTop: spacing.lg },
  demand: { marginTop: spacing.xl },
  demandHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  demandTitle: { fontSize: 16, fontWeight: '800', color: colors.text, flexShrink: 1 },
  demandLink: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  routinesTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  routineItem: { paddingVertical: spacing.md },
  routineBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  routineInfo: { marginBottom: spacing.sm },
  routineRoute: { fontSize: 15, fontWeight: '700', color: colors.text },
  routineMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  routineStatus: { fontSize: 12.5, fontWeight: '700', marginTop: 2 },
  routineActions: { flexDirection: 'row', gap: spacing.xl },
  routineAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routineActionText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
});

export default PublishScreen;
