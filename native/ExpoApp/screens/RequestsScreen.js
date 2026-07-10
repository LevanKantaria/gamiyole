import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/ui/Screen';
import ScreenHeader from '../components/ui/ScreenHeader';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import EmptyState from '../components/ui/EmptyState';
import ListOptions from '../components/ListOptions';
import CalendarModal from '../components/CalendarModal';
import RequestCard from '../components/RequestCard';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeRequests, createRequest } from '../services/requests';
import { todayISO } from '../services/rides';
import { colors, spacing, radius } from '../theme';

const RequestsScreen = ({ navigation, route }) => {
  const { t } = useLocale();
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState(null);
  const [formOpen, setFormOpen] = useState(!!route.params?.openForm);

  useEffect(() => subscribeRequests(setRequests), []);

  // Reachable both as a tab and via navigate('Requests', { openForm }) from the
  // Find empty-state CTA — open the form when asked, then clear the param so a
  // later tab visit doesn't reopen it.
  useEffect(() => {
    if (route.params?.openForm) {
      setFormOpen(true);
      navigation.setParams({ openForm: false });
    }
  }, [route.params?.openForm, navigation]);

  const openProfile = (r) =>
    navigation.navigate('UserProfile', { userId: r.passengerUid, userName: r.name });

  return (
    <Screen flush>
      <ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader icon="hail" title={t('requests.title')} subtitle={t('requests.subtitle')} />

        <View style={styles.body}>
          <View style={styles.howCard}>
            <Text style={styles.howLabel}>{t('requests.howItWorks')}</Text>
            {['how1', 'how2', 'how3'].map((key, i) => (
              <View key={key} style={styles.howStep}>
                <View style={styles.howNum}>
                  <Text style={styles.howNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.howStepText}>{t(`requests.${key}`)}</Text>
              </View>
            ))}
          </View>

          {requests === null ? (
            <Loading text={t('common.loading')} />
          ) : requests.length === 0 ? (
            <EmptyState
              icon="person-search"
              title={t('requests.empty')}
              subtitle={t('requests.emptySub')}
            />
          ) : (
            <>
              <Text style={styles.sectionLabel}>{t('requests.recent')}</Text>
              {requests.map((item) => (
                <RequestCard
                  key={item.id}
                  request={item}
                  currentUid={user?.uid}
                  onPressPassenger={
                    item.passengerUid === user?.uid ? undefined : () => openProfile(item)
                  }
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.fabWrap}>
        <Button
          title={t('requests.post')}
          icon="add"
          onPress={() => setFormOpen(true)}
        />
      </View>

      <RequestFormModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        uid={user?.uid}
        name={profile?.name}
        initial={route.params?.initial}
      />
    </Screen>
  );
};

const RequestFormModal = ({ visible, onClose, uid, name, initial }) => {
  const { t } = useLocale();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [note, setNote] = useState('');
  const [calendar, setCalendar] = useState(null); // 'from' | 'to' | null
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setFrom(initial?.from || '');
      setTo(initial?.to || '');
      setDateFrom(initial?.date || todayISO());
      setDateTo(initial?.date || todayISO());
      setNote('');
    }
  }, [visible, initial]);

  const submit = async () => {
    if (!from || !to) return Alert.alert(t('requests.title'), t('requests.errCities'));
    if (from === to) return Alert.alert(t('requests.title'), t('requests.errSameCity'));
    if (dateFrom < todayISO()) return Alert.alert(t('requests.title'), t('requests.errPast'));
    if (dateTo < dateFrom) return Alert.alert(t('requests.title'), t('requests.errDates'));

    setSubmitting(true);
    try {
      await createRequest(uid, { name, from, to, dateFrom, dateTo, note });
      Alert.alert(t('requests.posted'), t('requests.postedSub'));
      onClose();
    } catch {
      Alert.alert(t('common.error'), t('requests.errCities'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoider}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>{t('requests.post')}</Text>
              <Text style={styles.sheetHint}>{t('requests.postHint')}</Text>

              <ListOptions
                value={from}
                onValueChange={setFrom}
                placeholder={t('find.leavingFrom')}
                exclude={to}
              />
              <ListOptions
                value={to}
                onValueChange={setTo}
                placeholder={t('find.goingTo')}
                exclude={from}
              />

              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.dateBtn, styles.dateHalf]}
                  onPress={() => setCalendar('from')}
                >
                  <MaterialIcons name="event" size={18} color={colors.textMuted} />
                  <Text style={styles.dateBtnText}>{dateFrom}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateBtn, styles.dateHalf]}
                  onPress={() => setCalendar('to')}
                >
                  <MaterialIcons name="event" size={18} color={colors.textMuted} />
                  <Text style={styles.dateBtnText}>{dateTo}</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder={t('requests.notePlaceholder')}
                placeholderTextColor={colors.textFaint}
                multiline
                maxLength={200}
              />

              <Button
                title={submitting ? t('requests.posting') : t('requests.submit')}
                icon="check"
                onPress={submit}
                loading={submitting}
                style={styles.submitBtn}
              />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>

      <CalendarModal
        visible={calendar !== null}
        value={calendar === 'to' ? dateTo : dateFrom}
        onSelect={(iso) => {
          if (calendar === 'from') {
            setDateFrom(iso);
            if (dateTo < iso) setDateTo(iso);
          } else {
            setDateTo(iso);
          }
        }}
        onClose={() => setCalendar(null)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  howCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  howLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  howNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howNumText: { fontSize: 12, fontWeight: '800', color: colors.white },
  howStepText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.text },
  sectionLabel: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  scrollFlex: { flex: 1 },
  // Header + info card + request cards all live in one scroll, so the fixed
  // hero no longer eats space that used to be reserved for the card list.
  scrollContent: { paddingBottom: 100 },
  body: { padding: spacing.lg },
  fabWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  avoider: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  sheetHint: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  dateHalf: { width: '48%' },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  dateBtnText: { fontSize: 15, color: colors.text },
  noteInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 70,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  submitBtn: { marginTop: spacing.lg },
});

export default RequestsScreen;
