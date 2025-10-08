import crypto from 'crypto'
import fs from 'fs'

export interface EncryptedData {
    version: string
    salt: string
    iv: string
    ciphertext: string
    authTag: string
}

// PBKDF2 parameters following OWASP 2023 recommendations
const PBKDF2_ITERATIONS = 600000
const PBKDF2_KEYLEN = 32 // 256 bits for AES-256
const PBKDF2_DIGEST = 'sha256'
const SALT_LENGTH = 32 // 256 bits
const IV_LENGTH = 12 // 96 bits for GCM
const ENCRYPTION_VERSION = '1'

/**
 * Derives a cryptographic key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(
            password,
            salt,
            PBKDF2_ITERATIONS,
            PBKDF2_KEYLEN,
            PBKDF2_DIGEST,
            (err, derivedKey) => {
                if (err) reject(err)
                else resolve(derivedKey)
            }
        )
    })
}

/**
 * Encrypts plaintext using AES-256-GCM with password-based key derivation
 */
export async function encryptPrivateKey(
    plaintext: string,
    password: string
): Promise<EncryptedData> {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)

    // Derive encryption key from password
    const key = await deriveKey(password, salt)

    // Encrypt using AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64')
    ciphertext += cipher.final('base64')
    const authTag = cipher.getAuthTag()

    return {
        version: ENCRYPTION_VERSION,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        ciphertext,
        authTag: authTag.toString('base64')
    }
}

/**
 * Decrypts encrypted data using the provided password
 */
export async function decryptPrivateKey(
    encryptedData: EncryptedData,
    password: string
): Promise<string> {
    try {
        // Convert base64 strings back to buffers
        const salt = Buffer.from(encryptedData.salt, 'base64')
        const iv = Buffer.from(encryptedData.iv, 'base64')
        const authTag = Buffer.from(encryptedData.authTag, 'base64')

        // Derive decryption key from password
        const key = await deriveKey(password, salt)

        // Decrypt using AES-256-GCM
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
        decipher.setAuthTag(authTag)

        let plaintext = decipher.update(encryptedData.ciphertext, 'base64', 'utf8')
        plaintext += decipher.final('utf8')

        return plaintext
    } catch (error) {
        throw new Error('Decryption failed. Wrong password or corrupted data.')
    }
}

/**
 * Checks if a file contains encrypted data
 */
export function isFileEncrypted(filepath: string): boolean {
    try {
        if (!fs.existsSync(filepath)) {
            return false
        }

        const content = fs.readFileSync(filepath, 'utf8')
        const data = JSON.parse(content)

        // Check if it has the expected encrypted format structure
        return (
            typeof data === 'object' &&
            data !== null &&
            'version' in data &&
            'salt' in data &&
            'iv' in data &&
            'ciphertext' in data &&
            'authTag' in data
        )
    } catch (error) {
        // If JSON parsing fails, it's not an encrypted file
        return false
    }
}

/**
 * Loads encrypted data from a file
 */
export function loadEncryptedKey(filepath: string): EncryptedData | null {
    try {
        if (!fs.existsSync(filepath)) {
            return null
        }

        const content = fs.readFileSync(filepath, 'utf8')
        const data = JSON.parse(content) as EncryptedData

        // Validate structure
        if (
            !data.version ||
            !data.salt ||
            !data.iv ||
            !data.ciphertext ||
            !data.authTag
        ) {
            throw new Error('Invalid encrypted file format')
        }

        return data
    } catch (error) {
        console.error('Error loading encrypted key:', error)
        return null
    }
}

/**
 * Saves encrypted data to a file
 */
export function saveEncryptedKey(filepath: string, data: EncryptedData): void {
    try {
        const jsonContent = JSON.stringify(data, null, 2)
        fs.writeFileSync(filepath, jsonContent, 'utf8')
    } catch (error) {
        throw new Error(`Failed to save encrypted key: ${error}`)
    }
}
