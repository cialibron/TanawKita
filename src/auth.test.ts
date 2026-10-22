import { describe, expect, it } from 'vitest'
import { emailError, nameFromEmail, passwordError, signIn } from './auth'

describe('emailError', () => {
  it('asks for an email, then for a valid format', () => {
    expect(emailError('')).toBe('Enter your email address.')
    expect(emailError('ana@')).toMatch(/name@example.com/)
    expect(emailError('ana@gmail')).toMatch(/name@example.com/)
    expect(emailError(' ana.reyes@gmail.com ')).toBeNull()
  })
})

describe('passwordError', () => {
  it('only enforces the length rule when signing up', () => {
    expect(passwordError('', 'signin')).toBe('Enter your password.')
    expect(passwordError('short', 'signin')).toBeNull()
    expect(passwordError('short', 'signup')).toMatch(/at least 8/)
    expect(passwordError('long enough', 'signup')).toBeNull()
  })
})

describe('signIn', () => {
  it('signs in with 8+ characters and rejects shorter passwords with a generic error', async () => {
    await expect(signIn('ana.reyes@gmail.com', 'tanawkita', 0)).resolves.toMatchObject({ name: 'Ana Reyes' })
    await expect(signIn('ana.reyes@gmail.com', 'short', 0)).rejects.toThrow('Email or password is incorrect.')
  })

  it('builds a display name from the email', () => {
    expect(nameFromEmail('jun.dela-cruz@gmail.com')).toBe('Jun Dela Cruz')
  })
})
