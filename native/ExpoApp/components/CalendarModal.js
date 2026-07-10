import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocale } from '../context/LocaleContext';
import { DAYS_SHORT, MONTHS } from '../i18n/translations';
import { colors, spacing, radius } from '../theme';

const pad = (n) => String(n).padStart(2, '0');
const iso = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;
const todayLocalISO = () => {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
};

// Months the calendar can navigate ahead — rides aren't published further out.
const MAX_MONTHS_AHEAD = 6;

// Monday-first weekday header, values are Date#getDay() indices.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

// BlaBlaCar-style bottom-sheet calendar: month grid, past days disabled,
// today outlined, selected day filled. Calls onSelect with an ISO date string.
const CalendarModal = ({ visible, value, onSelect, onClose }) => {
  const { isGeorgian } = useLocale();
  const lang = isGeorgian ? 'GE' : 'EN';

  const [view, setView] = useState(() => {
    const d = value ? new Date(`${value}T00:00:00`) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (visible) {
      const d = value ? new Date(`${value}T00:00:00`) : new Date();
      setView({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [visible, value]);

  const today = todayLocalISO();
  const now = new Date();
  const monthOffset = (view.year - now.getFullYear()) * 12 + (view.month - now.getMonth());
  const canPrev = monthOffset > 0;
  const canNext = monthOffset < MAX_MONTHS_AHEAD;

  const move = (delta) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  // Leading blanks before day 1, Monday-first.
  const leading = (new Date(view.year, view.month, 1).getDay() + 6) % 7;

  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.head}>
            <TouchableOpacity
              style={[styles.nav, !canPrev && styles.navDisabled]}
              onPress={() => move(-1)}
              disabled={!canPrev}
              hitSlop={8}
            >
              <MaterialIcons name="chevron-left" size={26} color={canPrev ? colors.text : colors.border} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[lang][view.month]} {view.year}
            </Text>
            <TouchableOpacity
              style={[styles.nav, !canNext && styles.navDisabled]}
              onPress={() => move(1)}
              disabled={!canNext}
              hitSlop={8}
            >
              <MaterialIcons name="chevron-right" size={26} color={canNext ? colors.text : colors.border} />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {WEEK.map((d) => (
              <View key={`dow-${d}`} style={styles.cell}>
                <Text style={styles.dow}>{DAYS_SHORT[lang][d]}</Text>
              </View>
            ))}
            {cells.map((day, i) => {
              if (day === null) {
                return <View key={`blank-${i}`} style={styles.cell} />;
              }
              const dateISO = iso(view.year, view.month, day);
              const disabled = dateISO < today;
              const selected = dateISO === value;
              const isToday = dateISO === today;
              return (
                <View key={dateISO} style={styles.cell}>
                  <TouchableOpacity
                    style={[styles.day, isToday && styles.today, selected && styles.selected]}
                    disabled={disabled}
                    onPress={() => {
                      onSelect(dateISO);
                      onClose();
                    }}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        disabled && styles.dayTextDisabled,
                        selected && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 1.5,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthLabel: { fontSize: 17, fontWeight: '800', color: colors.text },
  nav: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  navDisabled: { opacity: 0.4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textFaint,
    textTransform: 'uppercase',
    paddingVertical: 4,
  },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  dayText: { fontSize: 15, fontWeight: '600', color: colors.text },
  dayTextDisabled: { color: colors.border },
  dayTextSelected: { color: colors.white },
});

export default CalendarModal;
