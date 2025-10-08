import inquirer from 'inquirer'

export interface PasswordValidationResult {
    valid: boolean
    message?: string
}

/**
 * Validates password strength according to security requirements
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
    if (password.length < 8) {
        return {
            valid: false,
            message: 'Password must be at least 8 characters long'
        }
    }

    if (!/[A-Z]/.test(password)) {
        return {
            valid: false,
            message: 'Password must contain at least one uppercase letter'
        }
    }

    if (!/[a-z]/.test(password)) {
        return {
            valid: false,
            message: 'Password must contain at least one lowercase letter'
        }
    }

    if (!/[0-9]/.test(password)) {
        return {
            valid: false,
            message: 'Password must contain at least one number'
        }
    }

    return { valid: true }
}

/**
 * Prompts user for a password with optional confirmation and hidden input
 */
export async function promptPassword(
    message: string = 'Enter password:',
    confirm: boolean = false
): Promise<string> {
    const answers = await inquirer.prompt([
        {
            type: 'password',
            name: 'password',
            message,
            mask: '*'
        }
    ])

    if (confirm) {
        const confirmAnswers = await inquirer.prompt([
            {
                type: 'password',
                name: 'confirmPassword',
                message: 'Confirm password:',
                mask: '*'
            }
        ])

        if (answers.password !== confirmAnswers.confirmPassword) {
            throw new Error('Passwords do not match')
        }
    }

    return answers.password
}

/**
 * Prompts for a password with validation and optional confirmation
 */
export async function promptPasswordWithValidation(
    message: string = 'Enter password:',
    confirm: boolean = true
): Promise<string> {
    while (true) {
        try {
            const password = await promptPassword(message, confirm)
            const validation = validatePasswordStrength(password)

            if (!validation.valid) {
                console.log(`\nPassword validation failed: ${validation.message}`)
                console.log('Please try again.\n')
                continue
            }

            return password
        } catch (error) {
            if (error instanceof Error && error.message === 'Passwords do not match') {
                console.log('\nPasswords do not match. Please try again.\n')
                continue
            }
            throw error
        }
    }
}
