import { Capacitor } from '@capacitor/core';
import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver, inMemoryPersistence, type Auth } from 'firebase/auth';
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
// (LocalStorage preferred on iOS to avoid IndexedDB hangs on WebKit/WKWebView).
const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();

const persistenceMode = (isNative && platform === 'ios')
  ? [browserLocalPersistence]
  : [indexedDBLocalPersistence, browserLocalPersistence];

let auth: Auth;
try {
  const authOptions: any = {
    persistence: persistenceMode,
  };
  if (!isNative) {
    authOptions.popupRedirectResolver = browserPopupRedirectResolver;
  }
  auth = initializeAuth(app, authOptions);
} catch (error) {
  console.error('Error initializing Firebase Auth:', error);
  // Fallback to in-memory persistence if others fail
  try {
    auth = initializeAuth(app, {
      persistence: [inMemoryPersistence],
    });
  } catch (innerError) {
    console.error('Critical error initializing fallback Auth:', innerError);
  }
}

export { auth };
export const db = getFirestore(app);
export default app;

