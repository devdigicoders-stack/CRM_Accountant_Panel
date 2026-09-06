importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBseyWQJeqs6wrHRSX40OcTVMSoQCfRlss",
  authDomain: "tt-crm-f6a6c.firebaseapp.com",
  projectId: "tt-crm-f6a6c",
  storageBucket: "tt-crm-f6a6c.firebasestorage.app",
  messagingSenderId: "833472295992",
  appId: "1:833472295992:web:2822bf9709d1e43eb8a2cd",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "New Notification", {
    body: body || "",
    icon: "/logo.png",
  });
});
