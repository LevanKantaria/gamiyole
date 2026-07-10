import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// Uploads a local image URI to Firebase Storage and returns a public download URL.
// This replaces the old broken behaviour of saving local device URIs to the
// database (which only worked on the device that picked the image).
export const uploadImageAsync = async (localUri, path) => {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
};

export const uploadProfileImage = (uid, localUri) =>
  uploadImageAsync(localUri, `profileImages/${uid}.jpg`);

export const uploadCarImage = (uid, localUri, index) =>
  uploadImageAsync(localUri, `carImages/${uid}/${index}-${Date.now()}.jpg`);
