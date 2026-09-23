import "dotenv/config";
import admin from "firebase-admin";
import { cert } from "firebase-admin/app";

// Initialize Firebase Admin
if (!process.env.FIREBASE_PROJECT_ID) {
  throw new Error("FIREBASE_PROJECT_ID must be set");
}

if (!process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error("FIREBASE_PRIVATE_KEY must be set");
}

if (!process.env.FIREBASE_CLIENT_EMAIL) {
  throw new Error("FIREBASE_CLIENT_EMAIL must be set");
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\\n/g, "\n")
  .replace(/\r\n/g, "\n");

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: cert(serviceAccount as admin.ServiceAccount),
});

export const db = admin.firestore();
