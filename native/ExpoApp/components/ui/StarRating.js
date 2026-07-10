import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme';

// Display or interactive star rating.
const StarRating = ({ value = 0, size = 18, onChange, editable = false }) => (
  <View style={styles.row}>
    {[1, 2, 3, 4, 5].map((star) => {
      const filled = star <= Math.round(value);
      const Star = (
        <MaterialIcons
          name={editable ? (filled ? 'star' : 'star-border') : 'star'}
          size={size}
          color={filled ? colors.star : colors.border}
        />
      );
      if (!editable) {
        return <View key={star}>{Star}</View>;
      }
      return (
        <TouchableOpacity key={star} onPress={() => onChange?.(star)} style={styles.button}>
          {Star}
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  button: { padding: 3 },
});

export default StarRating;
