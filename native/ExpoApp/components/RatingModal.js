import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  Pressable,
  InputAccessoryView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Input from './ui/Input';
import Button from './ui/Button';
import StarRating from './ui/StarRating';
import { useLocale } from '../context/LocaleContext';
import { submitRating } from '../services/ratings';
import { colors, spacing, radius } from '../theme';

const COMMENT_ACCESSORY_ID = 'ratingCommentAccessory';

const RatingModal = ({ visible, onClose, targetUserId, targetUserName, rater, existing, onSubmitted }) => {
  const { t } = useLocale();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const ratingWords = [
    '',
    t('rating.poor'),
    t('rating.fair'),
    t('rating.good'),
    t('rating.veryGood'),
    t('rating.excellent'),
  ];

  useEffect(() => {
    if (visible) {
      setRating(existing?.rating || 0);
      setComment(existing?.comment || '');
      setSubmitted(false);
    }
  }, [visible, existing]);

  const finish = () => {
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (rating === 0) {
      Alert.alert(t('rating.pickRating'), t('rating.pickRatingSub'));
      return;
    }
    if (!comment.trim()) {
      Alert.alert(t('rating.addComment'), t('rating.addCommentSub'));
      return;
    }
    setSubmitting(true);
    try {
      await submitRating(targetUserId, rater, { rating, comment });
      onSubmitted?.();
      // Show a success confirmation, then auto-close shortly after.
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch {
      Alert.alert(t('common.error'), t('rating.submitFail'));
    } finally {
      setSubmitting(false);
    }
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={COMMENT_ACCESSORY_ID}>
          <View style={styles.accessory}>
            <TouchableOpacity onPress={dismissKeyboard} hitSlop={12}>
              <Text style={styles.accessoryDone}>{t('rating.done')}</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      ) : null}

      <Pressable style={styles.overlay} onPress={submitted ? finish : onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {submitted ? (
              <View style={[styles.sheet, styles.successSheet]}>
                <View style={styles.successIcon}>
                  <MaterialIcons name="check-circle" size={64} color={colors.success} />
                </View>
                <Text style={styles.successTitle}>{t('rating.thanksTitle')}</Text>
                <Text style={styles.successSub}>{t('rating.thanksSub')}</Text>
                <Button title={t('rating.done')} onPress={finish} />
              </View>
            ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.sheet}>
                <View style={styles.header}>
                  <Text style={styles.title}>{t('rating.title', { name: targetUserName })}</Text>
                  <TouchableOpacity onPress={onClose} hitSlop={12}>
                    <MaterialIcons name="close" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.starsWrap}>
                  <StarRating value={rating} onChange={setRating} editable size={40} />
                  <Text style={styles.ratingWord}>{ratingWords[rating] || t('rating.tapToRate')}</Text>
                </View>

                <Input
                  placeholder={t('rating.commentPlaceholder')}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  maxLength={500}
                  blurOnSubmit
                  returnKeyType="done"
                  onSubmitEditing={dismissKeyboard}
                  inputAccessoryViewID={Platform.OS === 'ios' ? COMMENT_ACCESSORY_ID : undefined}
                  containerStyle={styles.commentInput}
                />

                <Button title={t('rating.submit')} icon="send" onPress={handleSubmit} loading={submitting} />
              </View>
            </ScrollView>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: { width: '100%' },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 },
  successSheet: { alignItems: 'center', paddingTop: spacing.xl * 1.5 },
  successIcon: { marginBottom: spacing.md },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  successSub: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  starsWrap: { alignItems: 'center', marginBottom: spacing.lg },
  ratingWord: { marginTop: spacing.sm, fontSize: 16, fontWeight: '600', color: colors.star },
  commentInput: { marginBottom: spacing.md },
  accessory: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  accessoryDone: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default RatingModal;
