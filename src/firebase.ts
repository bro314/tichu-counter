import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDSQ_cobJxvxY1dPhTgOjq31LUlZ9cwyZA',
  authDomain: 'dragons-count.de',
  projectId: 'tichu-counter-2c9ff',
  storageBucket: 'tichu-counter-2c9ff.firebasestorage.app',
  messagingSenderId: '1017263787450',
  appId: '1:1017263787450:web:4014c51d2ff2a75ae5a183',
  measurementId: 'G-PWPHPXBRJV',
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth explicitly with dynamic persistence fallbacks
// (IndexedDB -> LocalStorage). This prevents crashes and SecurityErrors under
// custom native schemes like capacitor:// on iOS.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const db = getFirestore(app);
export default app;
