import { supabase } from './supabase'
import { encryptData, decryptData, hashPassword } from './encryption'

// Store current user session
let currentUser = null
let currentPassword = null

/**
 * Initialize user session
 */
export function initSession(username, password) {
    currentUser = username
    currentPassword = password
}

/**
 * Clear user session
 */
export function clearSession() {
    currentUser = null
    currentPassword = null
}

/**
 * Register a new user
 */
export async function registerUser(username, password) {
    try {
        const hashedPassword = hashPassword(password)
        
        // Create initial empty data structure
        const initialData = {
            entries: [],
            habits: [],
            templates: [],
            reminders: []
        }
        
        const encryptedData = encryptData(initialData, password)
        
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    password: hashedPassword,
                    encrypted_data: encryptedData
                }
            ])
            .select()
        
        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error('Username already exists')
            }
            throw error
        }
        
        initSession(username, password)
        return { success: true, data }
    } catch (error) {
        console.error('Registration error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Login user
 */
export async function loginUser(username, password) {
    try {
        const hashedPassword = hashPassword(password)
        
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', hashedPassword)
            .single()
        
        if (error || !data) {
            throw new Error('Invalid username or password')
        }
        
        // Try to decrypt data to verify password is correct
        try {
            if (data.encrypted_data) {
                decryptData(data.encrypted_data, password)
            }
        } catch (decryptError) {
            throw new Error('Invalid password')
        }
        
        initSession(username, password)
        return { success: true, user: data }
    } catch (error) {
        console.error('Login error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Save all data to database (encrypted)
 */
export async function saveAllData(data) {
    if (!currentUser || !currentPassword) {
        throw new Error('No active session')
    }
    
    try {
        const encryptedData = encryptData(data, currentPassword)
        
        const { error } = await supabase
            .from('users')
            .update({ encrypted_data: encryptedData })
            .eq('username', currentUser)
        
        if (error) throw error
        
        return { success: true }
    } catch (error) {
        console.error('Save error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Load all data from database (decrypt)
 */
export async function loadAllData() {
    if (!currentUser || !currentPassword) {
        throw new Error('No active session')
    }
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('encrypted_data')
            .eq('username', currentUser)
            .single()
        
        if (error) throw error
        
        if (!data.encrypted_data) {
            // No data yet, return empty structure
            return {
                entries: [],
                habits: [],
                templates: [],
                reminders: []
            }
        }
        
        const decryptedData = decryptData(data.encrypted_data, currentPassword)
        return decryptedData
    } catch (error) {
        console.error('Load error:', error)
        throw error
    }
}

/**
 * Get current username
 */
export function getCurrentUser() {
    return currentUser
}
