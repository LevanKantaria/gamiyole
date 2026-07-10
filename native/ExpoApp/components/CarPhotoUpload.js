import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { batchOptimizeImages, validateImage } from '../utils/imageOptimizer';
import { useLocale } from '../context/LocaleContext';
import { colors, spacing, radius } from '../theme';

const CarPhotoUpload = ({ onImagesSelected, initialUris = [] }) => {
  const { t } = useLocale();
  const [selectedImages, setSelectedImages] = useState(initialUris);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialUris?.length > 0) {
      setSelectedImages(initialUris);
    }
  }, [initialUris]);

  const pickImages = async () => {
    try {
      setUploading(true);

      // System photo picker (PHPicker) — multi-select without full-library
      // access, so no permission prompt (Apple review 5.1.1).
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const originalUris = result.assets.map((asset) => asset.uri);
        const optimizedUris = await batchOptimizeImages(originalUris, 'car');

        const optimizedValidations = await Promise.all(
          optimizedUris.map((uri) => validateImage(uri, 'car'))
        );
        const stillTooLarge = optimizedValidations.filter((v) => !v.valid);
        if (stillTooLarge.length > 0) {
          Alert.alert(
            t('upload.imageTooLarge'),
            t('upload.imagesTooLarge', { n: stillTooLarge.length })
          );
          return;
        }

        const newImages = [...selectedImages, ...optimizedUris];
        setSelectedImages(newImages);
        onImagesSelected(newImages);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert(t('common.error'), t('upload.pickFail'));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    onImagesSelected(newImages);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('upload.carPhotos')}</Text>

      <TouchableOpacity style={styles.addButton} onPress={pickImages} disabled={uploading}>
        {uploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.uploadingText}>{t('common.processing')}</Text>
          </View>
        ) : (
          <View style={styles.addButtonContent}>
            <MaterialIcons name="add-photo-alternate" size={24} color={colors.primary} />
            <Text style={styles.addButtonText}>{t('upload.addCarPhotos')}</Text>
          </View>
        )}
      </TouchableOpacity>

      {selectedImages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
          {selectedImages.map((uri, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri }} style={styles.carImage} resizeMode="cover" />
              <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}>
                <MaterialIcons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <Text style={styles.helpText}>{t('upload.carHelp')}</Text>
    </View>
  );
};

const THUMB_WIDTH = 120;
const THUMB_HEIGHT = 90;

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
    color: colors.text,
  },
  addButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadingText: {
    marginLeft: spacing.sm,
    color: colors.primary,
    fontSize: 16,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    marginLeft: spacing.sm,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  imageList: {
    marginTop: spacing.md,
  },
  imageContainer: {
    position: 'relative',
    marginRight: spacing.md,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  carImage: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.danger,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  helpText: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textMuted,
  },
});

export default CarPhotoUpload;
