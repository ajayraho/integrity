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
    'auth/network-request-failed': 'No connection. Check your internet and try again.',
}

export function friendlyAuthError(error) {
    return MESSAGES[error?.code] || error?.message || 'Something went wrong'
}

export const register = (email, password) => createUserWithEmailAndPassword(auth, email.trim(), password)
export const login = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password)
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim())
export const logout = () => signOut(auth)
export const watchAuth = (fn) => onAuthStateChanged(auth, fn)
