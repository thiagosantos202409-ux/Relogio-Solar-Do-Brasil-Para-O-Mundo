import { db } from "../lib/firebase";
import { collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore";

export interface HistoryEntry {
  id: string;
  userId: string;
  timestamp: Date;
  data: any;
}

const COLLECTION_NAME = "history";

export async function saveHistoryEntry(userId: string, data: any) {
  try {
    const sanitizedData = sanitizeData(data);
    await addDoc(collection(db, COLLECTION_NAME), {
      userId,
      timestamp: new Date(),
      data: sanitizedData,
    });
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

function sanitizeData(data: any): any {
  if (data === undefined) return null;
  if (data === null) return null;
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  
  const sanitized: any = {};
  for (const key in data) {
    if (data[key] !== undefined) {
      sanitized[key] = sanitizeData(data[key]);
    }
  }
  return sanitized;
}

export async function getHistoryEntries(userId: string) {
  const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryEntry));
}
