import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';

// Verified checkmark shown next to a verified member's name. Defaults to the
// blue "verified" color; pass color="#fff" on dark/gradient backgrounds.
const VerifiedBadge = ({ size = 16, color = '#1d9bf0' }) => (
  <MaterialIcons name="verified" size={size} color={color} />
);

export default VerifiedBadge;
