import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { optimizeImage, validateImage } from '../utils/imageOptimizer';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme';

const AvatarUpload = ({ onImageSelected, initialUri = null }) => {
  const { t } = useLocale();
  const [selectedImage, setSelectedImage] = useState(initialUri);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialUri) {
      setSelectedImage(initialUri);
    }
  }, [initialUri]);

  const pickImage = async () => {
    try {
      setUploading(true);

      // The system photo picker (PHPicker) lets the user pick one photo without
      // granting full-library access — no permission prompt. `allowsEditing` is
      // omitted on purpose: it would fall back to the legacy picker that DOES
      // require full-library access (Apple review 5.1.1). We crop/resize in
      // optimizeImage instead.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const originalUri = result.assets[0].uri;
        const optimizedUri = await optimizeImage(originalUri, 'avatar');
        const optimizedValidation = await validateImage(optimizedUri, 'avatar');

        if (!optimizedValidation.valid) {
          Alert.alert(t('upload.imageTooLarge'), optimizedValidation.message);
          return;
        }

        setSelectedImage(optimizedUri);
        onImageSelected(optimizedUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('upload.pickImageFail'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.uploadButton} onPress={pickImage} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <MaterialIcons name="add-a-photo" size={40} color={colors.textMuted} />
            <Text style={styles.placeholderText}>{t('upload.addPhoto')}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  uploadButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
  },
});

export default AvatarUpload;
