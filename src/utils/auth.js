import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
} from 'firebase/auth'
import { auth } from './firebase'

const MESSAGES = {
    'auth/invalid-email': 'That email address looks wrong.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'Wrong email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
    'auth/network-request-failed': "Can't reach Firebase. Check your connection, and turn off ad/privacy blockers for this site.",
    'auth/operation-not-allowed': 'Email/password sign-in is turned off. Enable it in Firebase console → Authentication → Sign-in method.',
    'auth/configuration-not-found': 'Authentication isn\'t set up yet. In Firebase console open Authentication and click "Get started".',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'The Firebase API key in .env is wrong. Copy it again from Project settings.',
}

export function friendlyAuthError(error) {
    if (MESSAGES[error?.code]) return MESSAGES[error.code]
    // Browser couldn't reach Google at all (offline, VPN/firewall, or an ad/privacy blocker)
    if (/failed to fetch|network/i.test(String(error?.message || error))) {
        return "Can't reach Firebase. Check your connection, and turn off ad/privacy blockers for this site."
    }
    return error?.message || 'Something went wrong'
}

export const register = (email, password) => createUserWithEmailAndPassword(auth, email.trim(), password)
export const login = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password)
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim())
export const logout = () => signOut(auth)
export const watchAuth = (fn) => onAuthStateChanged(auth, fn)
