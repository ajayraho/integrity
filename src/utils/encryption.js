import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY

/**
 * Encrypt data using AES encryption
 * @param {Object} data - The data to encrypt
 * @param {string} password - User's password for additional security
 * @returns {string} Encrypted string
 */
export function encryptData(data, password) {
    try {
        const jsonString = JSON.stringify(data)
        // Combine encryption key with user password for extra security
        const combinedKey = ENCRYPTION_KEY + password
        const encrypted = CryptoJS.AES.encrypt(jsonString, combinedKey).toString()
        return encrypted
    } catch (error) {
        console.error('Encryption error:', error)
        throw new Error('Failed to encrypt data')
    }
}

/**
 * Decrypt data using AES decryption
 * @param {string} encryptedData - The encrypted string
 * @param {string} password - User's password
 * @returns {Object} Decrypted data object
 */
export function decryptData(encryptedData, password) {
    try {
        if (!encryptedData) {
            return null
        }
        // Combine encryption key with user password
        const combinedKey = ENCRYPTION_KEY + password
        const decrypted = CryptoJS.AES.decrypt(encryptedData, combinedKey)
        const jsonString = decrypted.toString(CryptoJS.enc.Utf8)
        
        if (!jsonString) {
            throw new Error('Decryption failed - wrong password?')
        }
        
        return JSON.parse(jsonString)
    } catch (error) {
        console.error('Decryption error:', error)
        throw new Error('Failed to decrypt data - wrong password?')
    }
}

/**
 * Hash password for storage (simple hashing)
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
export function hashPassword(password) {
    return CryptoJS.SHA256(password + ENCRYPTION_KEY).toString()
}
