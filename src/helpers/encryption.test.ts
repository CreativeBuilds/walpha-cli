import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import fs from 'fs'
import {
    encryptPrivateKey,
    decryptPrivateKey,
    isFileEncrypted,
    loadEncryptedKey,
    saveEncryptedKey,
    type EncryptedData
} from './encryption'

describe('Encryption Module', () => {
    const testPassword = 'TestPassword123'
    const testPlaintext = 'test private key or seed phrase'
    const testFilePath = 'test-encryption-file.txt'

    afterEach(() => {
        // Clean up test files
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath)
        }
    })

    describe('encryptPrivateKey', () => {
        test('should encrypt plaintext successfully', async () => {
            const encrypted = await encryptPrivateKey(testPlaintext, testPassword)

            expect(encrypted).toBeDefined()
            expect(encrypted.version).toBe('1')
            expect(encrypted.salt).toBeDefined()
            expect(encrypted.iv).toBeDefined()
            expect(encrypted.ciphertext).toBeDefined()
            expect(encrypted.authTag).toBeDefined()
        })

        test('should produce different ciphertexts for same plaintext (different salt/IV)', async () => {
            const encrypted1 = await encryptPrivateKey(testPlaintext, testPassword)
            const encrypted2 = await encryptPrivateKey(testPlaintext, testPassword)

            expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext)
            expect(encrypted1.salt).not.toBe(encrypted2.salt)
            expect(encrypted1.iv).not.toBe(encrypted2.iv)
        })

        test('should handle empty string', async () => {
            const encrypted = await encryptPrivateKey('', testPassword)
            expect(encrypted.ciphertext).toBeDefined()
        })

        test('should handle long plaintext', async () => {
            const longText = 'a'.repeat(10000)
            const encrypted = await encryptPrivateKey(longText, testPassword)
            expect(encrypted.ciphertext).toBeDefined()
        })
    })

    describe('decryptPrivateKey', () => {
        test('should decrypt encrypted data successfully', async () => {
            const encrypted = await encryptPrivateKey(testPlaintext, testPassword)
            const decrypted = await decryptPrivateKey(encrypted, testPassword)

            expect(decrypted).toBe(testPlaintext)
        })

        test('should throw error with wrong password', async () => {
            const encrypted = await encryptPrivateKey(testPlaintext, testPassword)

            await expect(
                decryptPrivateKey(encrypted, 'WrongPassword123')
            ).rejects.toThrow('Decryption failed')
        })

        test('should throw error with corrupted ciphertext', async () => {
            const encrypted = await encryptPrivateKey(testPlaintext, testPassword)
            encrypted.ciphertext = 'corrupted_data'

            await expect(
                decryptPrivateKey(encrypted, testPassword)
            ).rejects.toThrow()
        })

        test('should throw error with corrupted auth tag', async () => {
            const encrypted = await encryptPrivateKey(testPlaintext, testPassword)
            encrypted.authTag = Buffer.from('wrong_tag').toString('base64')

            await expect(
                decryptPrivateKey(encrypted, testPassword)
            ).rejects.toThrow()
        })

        test('should handle unicode characters', async () => {
            const unicodeText = '你好世界 🚀 émojis'
            const encrypted = await encryptPrivateKey(unicodeText, testPassword)
            const decrypted = await decryptPrivateKey(encrypted, testPassword)

            expect(decrypted).toBe(unicodeText)
        })
    })

    describe('encrypt/decrypt roundtrip', () => {
        test('should successfully roundtrip various inputs', async () => {
            const testCases = [
                'simple text',
                '0x1234567890abcdef',
                'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12',
                'special !@#$%^&*() characters',
                '12345',
                ' spaces before and after ',
                'UPPERCASE',
                'lowercase'
            ]

            for (const testCase of testCases) {
                const encrypted = await encryptPrivateKey(testCase, testPassword)
                const decrypted = await decryptPrivateKey(encrypted, testPassword)
                expect(decrypted).toBe(testCase)
            }
        })

        test('should work with different passwords', async () => {
            const passwords = [
                'Password123',
                'VeryL0ngP@ssw0rd!',
                'Short1',
                'unicode密码123'
            ]

            for (const pwd of passwords) {
                const encrypted = await encryptPrivateKey(testPlaintext, pwd)
                const decrypted = await decryptPrivateKey(encrypted, pwd)
                expect(decrypted).toBe(testPlaintext)
            }
        })
    })

    describe('isFileEncrypted', () => {
        test('should return false for non-existent file', () => {
            expect(isFileEncrypted('non-existent-file.txt')).toBe(false)
        })

        test('should return true for encrypted file', async () => {
            const encrypted = await encryptPrivateKey(testPlaintext, testPassword)
            saveEncryptedKey(testFilePath, encrypted)

            expect(isFileEncrypted(testFilePath)).toBe(true)
        })

        test('should return false for plaintext file', () => {
            fs.writeFileSync(testFilePath, 'plain text content', 'utf8')
            expect(isFileEncrypted(testFilePath)).toBe(false)
        })

        test('should return false for invalid JSON file', () => {
            fs.writeFileSync(testFilePath, '{invalid json}', 'utf8')
            expect(isFileEncrypted(testFilePath)).toBe(false)
        })

        test('should return false for JSON without required fields', () => {
            fs.writeFileSync(testFilePath, JSON.stringify({ version: '1' }), 'utf8')
            expect(isFileEncrypted(testFilePath)).toBe(false)
        })
    })

    describe('loadEncryptedKey', () => {
        test('should load encrypted data successfully', async () => {
            const encrypted = await encryptPrivateKey(testPlaintext, testPassword)
            saveEncryptedKey(testFilePath, encrypted)

            const loaded = loadEncryptedKey(testFilePath)
            expect(loaded).toBeDefined()
            expect(loaded?.version).toBe(encrypted.version)
            expect(loaded?.salt).toBe(encrypted.salt)
            expect(loaded?.iv).toBe(encrypted.iv)
            expect(loaded?.ciphertext).toBe(encrypted.ciphertext)
            expect(loaded?.authTag).toBe(encrypted.authTag)
        })

        test('should return null for non-existent file', () => {
            expect(loadEncryptedKey('non-existent-file.txt')).toBe(null)
        })

        test('should return null for invalid JSON', () => {
            fs.writeFileSync(testFilePath, 'not json', 'utf8')
            expect(loadEncryptedKey(testFilePath)).toBe(null)
        })

        test('should return null for incomplete encrypted data', () => {
            const incomplete = { version: '1', salt: 'test' }
            fs.writeFileSync(testFilePath, JSON.stringify(incomplete), 'utf8')
            expect(loadEncryptedKey(testFilePath)).toBe(null)
        })
    })

    describe('saveEncryptedKey', () => {
        test('should save encrypted data to file', async () => {
            const encrypted = await encryptPrivateKey(testPlaintext, testPassword)
            saveEncryptedKey(testFilePath, encrypted)

            expect(fs.existsSync(testFilePath)).toBe(true)
            const content = fs.readFileSync(testFilePath, 'utf8')
            const parsed = JSON.parse(content)

            expect(parsed.version).toBe(encrypted.version)
            expect(parsed.salt).toBe(encrypted.salt)
        })

        test('should create valid JSON', async () => {
            const encrypted = await encryptPrivateKey(testPlaintext, testPassword)
            saveEncryptedKey(testFilePath, encrypted)

            const content = fs.readFileSync(testFilePath, 'utf8')
            expect(() => JSON.parse(content)).not.toThrow()
        })

        test('should overwrite existing file', async () => {
            const encrypted1 = await encryptPrivateKey('first', testPassword)
            const encrypted2 = await encryptPrivateKey('second', testPassword)

            saveEncryptedKey(testFilePath, encrypted1)
            saveEncryptedKey(testFilePath, encrypted2)

            const loaded = loadEncryptedKey(testFilePath)
            expect(loaded?.ciphertext).toBe(encrypted2.ciphertext)
        })
    })

    describe('Integration tests', () => {
        test('should complete full encryption workflow', async () => {
            // Encrypt
            const encrypted = await encryptPrivateKey(testPlaintext, testPassword)

            // Save to file
            saveEncryptedKey(testFilePath, encrypted)

            // Verify file is encrypted
            expect(isFileEncrypted(testFilePath)).toBe(true)

            // Load from file
            const loaded = loadEncryptedKey(testFilePath)
            expect(loaded).not.toBe(null)

            // Decrypt
            const decrypted = await decryptPrivateKey(loaded!, testPassword)
            expect(decrypted).toBe(testPlaintext)
        })

        test('should handle multiple encrypt/save/load cycles', async () => {
            const testData = [
                { text: 'first key', password: 'Password1' },
                { text: 'second key', password: 'Password2' },
                { text: 'third key', password: 'Password3' }
            ]

            for (const { text, password } of testData) {
                const encrypted = await encryptPrivateKey(text, password)
                saveEncryptedKey(testFilePath, encrypted)

                const loaded = loadEncryptedKey(testFilePath)
                const decrypted = await decryptPrivateKey(loaded!, password)

                expect(decrypted).toBe(text)
            }
        })
    })

    describe('Edge cases', () => {
        test('should handle very long passwords', async () => {
            const longPassword = 'a'.repeat(1000)
            const encrypted = await encryptPrivateKey(testPlaintext, longPassword)
            const decrypted = await decryptPrivateKey(encrypted, longPassword)

            expect(decrypted).toBe(testPlaintext)
        })

        test('should handle special characters in password', async () => {
            const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?'
            const encrypted = await encryptPrivateKey(testPlaintext, specialPassword)
            const decrypted = await decryptPrivateKey(encrypted, specialPassword)

            expect(decrypted).toBe(testPlaintext)
        })

        test('should handle newlines in plaintext', async () => {
            const multilineText = 'line1\nline2\nline3'
            const encrypted = await encryptPrivateKey(multilineText, testPassword)
            const decrypted = await decryptPrivateKey(encrypted, testPassword)

            expect(decrypted).toBe(multilineText)
        })
    })
})
