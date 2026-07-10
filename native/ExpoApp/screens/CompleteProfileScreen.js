import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/ui/Screen';
import ScreenHeader from '../components/ui/ScreenHeader';
import SectionTitle from '../components/ui/SectionTitle';
import InfoBanner from '../components/ui/InfoBanner';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AvatarUpload from '../components/AvatarUpload';
import CarPhotoUpload from '../components/CarPhotoUpload';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { saveProfile, setProfileImage, setCarPhotos, normalizeFacebookUrl } from '../services/profile';
import { uploadProfileImage, uploadCarImage } from '../services/storage';
import { colors, spacing } from '../theme';

const isRemote = (uri) => typeof uri === 'string' && uri.startsWith('http');

const CompleteProfileScreen = ({ navigation }) => {
  const { t } = useLocale();
  const { user, profile } = useAuth();

  const [avatar, setAvatar] = useState(profile?.image || null);
  const [carPhotos, setCarPhotosState] = useState(profile?.carPhotos || []);
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.number || '');
  const [about, setAbout] = useState(profile?.aboutMe || '');
  const [age, setAge] = useState(profile?.age || '');
  const [carModel, setCarModel] = useState(profile?.model || '');
  const [carPlate, setCarPlate] = useState(profile?.plate || '');
  const [facebook, setFacebook] = useState(profile?.facebook || '');
  const [userType, setUserType] = useState(profile?.userType || 'passenger');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('completeProfile.nameRequired'), t('completeProfile.enterName'));
      return;
    }
    setSaving(true);
    try {
      await saveProfile(user.uid, {
        name: name.trim(),
        email: user.email,
        number: phone.trim(),
        aboutMe: about.trim(),
        age: age.trim(),
        userType,
        model: userType === 'driver' ? carModel.trim() : '',
        plate: userType === 'driver' ? carPlate.trim() : '',
        facebook: normalizeFacebookUrl(facebook),
      });

      if (avatar && !isRemote(avatar)) {
        const url = await uploadProfileImage(user.uid, avatar);
        await setProfileImage(user.uid, url);
      }

      if (userType === 'driver') {
        const urls = await Promise.all(
          carPhotos.map((uri, i) => (isRemote(uri) ? uri : uploadCarImage(user.uid, uri, i)))
        );
        await setCarPhotos(user.uid, urls);
      }

      Alert.alert(t('completeProfile.saved'), t('completeProfile.profileUpdated'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('completeProfile.saveFail'));
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!profile?.name;

  return (
    <Screen scroll keyboardAvoiding flush>
      <ScreenHeader
        icon="badge"
        title={isEdit ? t('completeProfile.editTitle') : t('completeProfile.title')}
        subtitle={t('completeProfile.subtitle')}
      />
      <View style={styles.wrap}>
        {!isEdit ? <InfoBanner variant="success" text={t('completeProfile.photoTip')} /> : null}

        <Card>
          <SectionTitle
            icon="photo-camera"
            title={t('completeProfile.profilePhoto')}
            subtitle={t('completeProfile.photoOptional')}
          />
          <AvatarUpload onImageSelected={setAvatar} initialUri={avatar} />

          <SectionTitle icon="person" title={t('completeProfile.basicInfo')} />
          <Input
            label={t('completeProfile.fullName')}
            placeholder={t('completeProfile.namePlaceholder')}
            value={name}
            onChangeText={setName}
          />
          <Input
            label={t('completeProfile.phone')}
            placeholder={t('completeProfile.phonePlaceholder')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Input
            label={t('completeProfile.age')}
            placeholder={t('completeProfile.age')}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            maxLength={3}
          />
          <Input
            label={t('common.aboutMe')}
            placeholder={t('completeProfile.aboutPlaceholder')}
            value={about}
            onChangeText={setAbout}
            multiline
          />
          <Input
            label={t('completeProfile.facebook')}
            placeholder={t('completeProfile.facebookHint')}
            value={facebook}
            onChangeText={setFacebook}
            autoCapitalize="none"
            keyboardType="url"
          />

          <SectionTitle icon="commute" title={t('completeProfile.howUse')} />
          <View style={styles.typeRow}>
            {[
              { key: 'driver', icon: 'directions-car', label: t('common.driver') },
              { key: 'passenger', icon: 'person', label: t('common.passenger') },
            ].map((opt) => {
              const active = userType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.typeButton, active && styles.typeButtonActive]}
                  onPress={() => setUserType(opt.key)}
                >
                  <MaterialIcons name={opt.icon} size={20} color={active ? colors.white : colors.primary} />
                  <Text style={[styles.typeText, active && styles.typeTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {userType === 'driver' ? (
            <View style={styles.topGap}>
              <SectionTitle icon="directions-car" title={t('completeProfile.yourVehicle')} />
              <Input
                label={t('completeProfile.carModel')}
                placeholder={t('completeProfile.carModelPlaceholder')}
                value={carModel}
                onChangeText={setCarModel}
              />
              <Input
                label={t('completeProfile.carPlate')}
                placeholder={t('completeProfile.carPlatePlaceholder')}
                value={carPlate}
                onChangeText={setCarPlate}
              />
              <CarPhotoUpload onImagesSelected={setCarPhotosState} initialUris={carPhotos} />
            </View>
          ) : null}

          <Button
            title={isEdit ? t('completeProfile.updateProfile') : t('completeProfile.saveProfile')}
            icon="check"
            onPress={handleSave}
            loading={saving}
          />
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingTop: spacing.sm },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
  },
  typeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { marginLeft: spacing.sm, fontSize: 15, fontWeight: '600', color: colors.primary },
  typeTextActive: { color: colors.white },
  topGap: { marginTop: spacing.sm },
});

export default CompleteProfileScreen;
