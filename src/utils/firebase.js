import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    memoryLocalCache,
    connectFirestoreEmulator,
} from 'firebase/firestore'

const env = import.meta.env

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)
if (!firebaseConfigured) {
    console.error('Firebase config missing. Copy .env.example to .env and fill in the values.')
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

function makeCache() {
    // Offline-first: data is cached in IndexedDB and writes queue while offline.
    // Falls back to memory cache where IndexedDB is unavailable (e.g. some private modes).
    try {
        return persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    } catch (e) {
        console.warn('Persistent cache unavailable, using memory cache', e)
        return memoryLocalCache()
    }
}

export const db = initializeFirestore(app, { localCache: makeCache() })

if (env.VITE_USE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
