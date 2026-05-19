import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDSQ_cobJxvxY1dPhTgOjq31LUlZ9cwyZA',
  authDomain: 'tichu-counter-2c9ff.firebaseapp.com',
  projectId: 'tichu-counter-2c9ff',
  storageBucket: 'tichu-counter-2c9ff.firebasestorage.app',
  messagingSenderId: '1017263787450',
  appId: '1:1017263787450:web:4014c51d2ff2a75ae5a183',
  measurementId: 'G-PWPHPXBRJV',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
