import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, serverTimestamp } from "firebase/firestore";
// @ts-ignore
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = firebaseConfig && firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const addSavedLocation = async (userId: string, location: { name: string, latitude: number, longitude: number }) => {
  return await addDoc(collection(db, 'users', userId, 'savedLocations'), {
    ...location,
    createdAt: serverTimestamp()
  });
}

export const getSavedLocations = async (userId: string) => {
  const querySnapshot = await getDocs(collection(db, 'users', userId, 'savedLocations'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export const deleteSavedLocation = async (userId: string, locationId: string) => {
  return await deleteDoc(doc(db, 'users', userId, 'savedLocations', locationId));
}
