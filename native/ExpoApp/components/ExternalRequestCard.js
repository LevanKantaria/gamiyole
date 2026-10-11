import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Card from './ui/Card';
import { useLocale } from '../context/LocaleContext';
import { cityLabel } from '../constants/cities';
import { colors, spacing, radius } from '../theme';

const BLUE = '#1877f2';

const ExternalRequestCard = ({ request }) => {
  const { t, isGeorgian } = useLocale();
  const openPost = () => request.sourceUrl && Linking.openURL(request.sourceUrl).catch(() => {});

  return (
    <View style={styles.wrap}>
      <View style={styles.accent} />
      <Card style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.route} numberOfLines={2}>
            {cityLabel(request.from, isGeorgian)} → {cityLabel(request.to, isGeorgian)}
          </Text>
          <Text style={styles.badge}>{t('rideCard.externalBadge')}</Text>
        </View>
        <Text style={styles.date}>
          {request.dateFrom}{request.departureTime ? ` · ${request.departureTime}` : ''}
        </Text>
        {request.note ? <Text style={styles.postText} numberOfLines={5}>“{request.note}”</Text> : null}
        <Text style={styles.note}>{t('rideCard.externalRequestNote')}</Text>
        {request.sourceUrl ? (
          <TouchableOpacity style={styles.link} onPress={openPost} activeOpacity={0.7}>
            <Text style={styles.linkText}>
              {request.linkType === 'group' ? t('rideCard.externalViewGroup') : t('rideCard.externalViewPost')}
            </Text>
            <MaterialIcons name="open-in-new" size={16} color={BLUE} />
          </TouchableOpacity>
        ) : null}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md, flexDirection: 'row' },
  accent: { width: 4, backgroundColor: BLUE, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg, marginRight: -2 },
  card: { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  route: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
  badge: { color: BLUE, fontSize: 11, fontWeight: '800' },
  date: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 13 },
  postText: { marginTop: spacing.md, color: colors.text, lineHeight: 20 },
  note: { marginTop: spacing.md, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  link: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { color: BLUE, fontSize: 13, fontWeight: '700' },
});

export default ExternalRequestCard;
