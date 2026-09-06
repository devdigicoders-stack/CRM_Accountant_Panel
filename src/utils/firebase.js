import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import axios from "axios";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBseyWQJeqs6wrHRSX40OcTVMSoQCfRlss",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tt-crm-f6a6c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tt-crm-f6a6c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tt-crm-f6a6c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "833472295992",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:833472295992:web:2822bf9709d1e43eb8a2cd",
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BEYWKVaEPo-3aPv2Ala9j_WVrOkPrVA9U_NTelblUF-r6j_hEbSosMfn0yRMjJjGlUPPrcqweaqx-cksKh6kjiQ";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const initNotifications = async (authToken) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied.");
      return null;
    }

    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const swRegistration = await navigator.serviceWorker.ready;

    const fcmToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (fcmToken && authToken) {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/fcm-token`,
        { fcmToken },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    }

    return fcmToken || null;
  } catch (err) {
    console.error("Error initializing notifications:", err);
  }
  return null;
};

export const listenForMessages = () => {
  onMessage(messaging, (payload) => {
    const { title, body } = payload.notification || {};
    toast(title || "New Notification", {
      description: body || "",
      duration: 5000,
    });
    // Fire event so Header badge updates instantly
    window.dispatchEvent(new Event("new-notification"));
  });
};
