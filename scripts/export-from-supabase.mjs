#!/usr/bin/env node
// One-time export of your data from the old Supabase version of Integrity.
//
// Usage (from the repo root):
//   node scripts/export-from-supabase.mjs <username> <password>
//
// Needs the OLD values (from your old .env) as environment variables or in .env.supabase:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ENCRYPTION_KEY
//
// Writes integrity-supabase-export.json. Import it in the app:
//   menu → Backup & Import → Import from file.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createDecipheriv, createHash } from 'node:crypto'

function loadEnvFile(path) {
    if (!existsSync(path)) return
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
}
loadEnvFile('.env.supabase')
loadEnvFile('.env')

// crypto-js AES.encrypt(text, passphrase) format: base64("Salted__" + salt(8) + ciphertext),
// key+iv derived with OpenSSL EVP_BytesToKey (MD5, 1 iteration), AES-256-CBC.
export function decryptCryptoJS(b64, passphrase) {
    const raw = Buffer.from(b64, 'base64')
    if (raw.subarray(0, 8).toString('latin1') !== 'Salted__') throw new Error('Unexpected ciphertext format')
    const salt = raw.subarray(8, 16)
    const data = raw.subarray(16)
    const pass = Buffer.from(passphrase, 'utf8')
    let derived = Buffer.alloc(0)
    let prev = Buffer.alloc(0)
    while (derived.length < 48) {
        prev = createHash('md5').update(Buffer.concat([prev, pass, salt])).digest()
        derived = Buffer.concat([derived, prev])
    }
    const decipher = createDecipheriv('aes-256-cbc', derived.subarray(0, 32), derived.subarray(32, 48))
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

async function main() {
    const [username, password] = process.argv.slice(2)
    const url = process.env.VITE_SUPABASE_URL
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY
    const encKey = process.env.VITE_ENCRYPTION_KEY
    if (!username || !password) {
        console.error('Usage: node scripts/export-from-supabase.mjs <username> <password>')
        process.exit(1)
    }
    if (!url || !anonKey || encKey === undefined) {
        console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_ENCRYPTION_KEY (put them in .env.supabase)')
        process.exit(1)
    }

    const res = await fetch(`${url}/rest/v1/users?select=encrypted_data&username=eq.${encodeURIComponent(username)}`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    })
    if (!res.ok) throw new Error(`Supabase request failed: ${res.status} ${await res.text()}`)
    const rows = await res.json()
    if (!rows.length) throw new Error(`No user named "${username}"`)

    const data = JSON.parse(decryptCryptoJS(rows[0].encrypted_data, encKey + password))
    const out = 'integrity-supabase-export.json'
    writeFileSync(out, JSON.stringify(data, null, 2))
    console.log(`Wrote ${out}`)
    console.log(`  entries: ${data.entries?.length || 0}, habits: ${data.habits?.length || 0}, templates: ${data.templates?.length || 0}`)
    console.log(`  badges: ${data.badges?.length || 0}, medals: ${data.medals?.length || 0}, reminders: ${data.reminders?.length || 0}`)
    console.log('Now import it in the app: menu → Backup & Import → Import from file.')
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(err => {
        console.error(err.message)
        process.exit(1)
    })
}
