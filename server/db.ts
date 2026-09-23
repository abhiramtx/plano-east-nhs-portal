import "dotenv/config";
import admin from "firebase-admin";
import { cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (!process.env.FIREBASE_PROJECT_ID) {
  throw new Error("FIREBASE_PROJECT_ID must be set");
}

const normalizePrivateKey = (value: string) =>
  value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");

let serviceAccount: { projectId: string; privateKey: string; clientEmail: string };
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || parsed.project_id,
      privateKey: normalizePrivateKey(parsed.private_key || ""),
      clientEmail: parsed.client_email,
    };
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid Firebase service-account JSON");
  }
} else {
  if (!process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT_JSON must be set");
  }

  if (!process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error("FIREBASE_CLIENT_EMAIL or FIREBASE_SERVICE_ACCOUNT_JSON must be set");
  }

  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };
}

admin.initializeApp({
  credential: cert(serviceAccount as admin.ServiceAccount),
});

export const db = process.env.FIREBASE_DATABASE_ID
  ? getFirestore(admin.app(), process.env.FIREBASE_DATABASE_ID)
  : admin.firestore();
