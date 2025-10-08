import { describe, test, expect } from 'bun:test'
import { validatePasswordStrength } from './password'

describe('Password Validation Module', () => {
    describe('validatePasswordStrength', () => {
        test('should accept valid passwords', () => {
            const validPasswords = [
                'Password1',
                'MyWallet123',
                'Secure123',
                'Test1234',
                'ComplexP@ss1',
                'UPPER123lower',
                'aB1cdefgh'
            ]

            for (const password of validPasswords) {
                const result = validatePasswordStrength(password)
                expect(result.valid).toBe(true)
                expect(result.message).toBeUndefined()
            }
        })

        test('should reject password with less than 8 characters', () => {
            const shortPasswords = [
                'Pass1',
                'Aa1',
                'Test12',
                'aB1'
            ]

            for (const password of shortPasswords) {
                const result = validatePasswordStrength(password)
                expect(result.valid).toBe(false)
                expect(result.message).toBe('Password must be at least 8 characters long')
            }
        })

        test('should reject password without uppercase letter', () => {
            const noUppercasePasswords = [
                'password1',
                'test1234',
                'mywalletkey1'
            ]

            for (const password of noUppercasePasswords) {
                const result = validatePasswordStrength(password)
                expect(result.valid).toBe(false)
                expect(result.message).toBe('Password must contain at least one uppercase letter')
            }
        })

        test('should reject password without lowercase letter', () => {
            const noLowercasePasswords = [
                'PASSWORD1',
                'TEST1234',
                'MYWALLETKEY1'
            ]

            for (const password of noLowercasePasswords) {
                const result = validatePasswordStrength(password)
                expect(result.valid).toBe(false)
                expect(result.message).toBe('Password must contain at least one lowercase letter')
            }
        })

        test('should reject password without number', () => {
            const noNumberPasswords = [
                'Password',
                'TestPassword',
                'MyWalletKey'
            ]

            for (const password of noNumberPasswords) {
                const result = validatePasswordStrength(password)
                expect(result.valid).toBe(false)
                expect(result.message).toBe('Password must contain at least one number')
            }
        })

        test('should handle empty string', () => {
            const result = validatePasswordStrength('')
            expect(result.valid).toBe(false)
            expect(result.message).toBe('Password must be at least 8 characters long')
        })

        test('should accept passwords with special characters', () => {
            const specialCharPasswords = [
                'Password1!',
                'Test@1234',
                'My$Wallet1',
                'Secure#Pass1',
                'Complex_P@ss1'
            ]

            for (const password of specialCharPasswords) {
                const result = validatePasswordStrength(password)
                expect(result.valid).toBe(true)
            }
        })

        test('should accept passwords with spaces', () => {
            const result = validatePasswordStrength('My Password 123')
            expect(result.valid).toBe(true)
        })

        test('should accept very long passwords', () => {
            const longPassword = 'Password1' + 'a'.repeat(1000)
            const result = validatePasswordStrength(longPassword)
            expect(result.valid).toBe(true)
        })

        test('should handle unicode characters', () => {
            // Unicode characters count as part of password but don't satisfy letter requirements
            const result = validatePasswordStrength('密码Password1')
            expect(result.valid).toBe(true)
        })

        test('should provide correct error message for multiple failures', () => {
            // When multiple requirements fail, it should return the first failure message
            const result = validatePasswordStrength('pass')
            expect(result.valid).toBe(false)
            expect(result.message).toBeDefined()
        })

        describe('Exact requirement boundaries', () => {
            test('should accept exactly 8 characters', () => {
                const result = validatePasswordStrength('Test1234')
                expect(result.valid).toBe(true)
            })

            test('should reject 7 characters', () => {
                const result = validatePasswordStrength('Test123')
                expect(result.valid).toBe(false)
            })

            test('should accept exactly one uppercase, lowercase, and number', () => {
                const result = validatePasswordStrength('aaaaaaa1A')
                expect(result.valid).toBe(true)
            })

            test('should accept multiple uppercase letters', () => {
                const result = validatePasswordStrength('PASSWORD1a')
                expect(result.valid).toBe(true)
            })

            test('should accept multiple numbers', () => {
                const result = validatePasswordStrength('Pass1234567890')
                expect(result.valid).toBe(true)
            })
        })

        describe('Real-world password examples', () => {
            test('should validate common password patterns', () => {
                const testCases = [
                    { password: 'Welcome123', expected: true },
                    { password: 'Admin123', expected: true },
                    { password: 'User1234', expected: true },
                    { password: 'MyWallet2024', expected: true },
                    { password: 'password', expected: false },
                    { password: '12345678', expected: false },
                    { password: 'PASSWORD', expected: false },
                    { password: 'Pass', expected: false }
                ]

                for (const { password, expected } of testCases) {
                    const result = validatePasswordStrength(password)
                    expect(result.valid).toBe(expected)
                }
            })
        })
    })
})
