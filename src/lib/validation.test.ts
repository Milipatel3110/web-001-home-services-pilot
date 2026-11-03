import { describe, expect, it } from 'vitest'
import {
  LIMITS,
  byteLength,
  hasErrors,
  isUuid,
  validateContact,
} from './validation'

const good = {
  name: 'Test Operator',
  email: 'operator@example.com',
  message: 'This is a harmless demonstration enquiry for the WEB-001 pilot.',
}

describe('validateContact', () => {
  it('accepts a well-formed submission', () => {
    expect(validateContact(good)).toEqual({})
    expect(hasErrors(validateContact(good))).toBe(false)
  })

  it('rejects every blank field with a message', () => {
    const errors = validateContact({ name: '', email: '', message: '' })
    expect(errors.name).toBeTruthy()
    expect(errors.email).toBeTruthy()
    expect(errors.message).toBeTruthy()
  })

  it('rejects whitespace-only fields', () => {
    const errors = validateContact({ name: '   ', email: '  ', message: '    ' })
    expect(hasErrors(errors)).toBe(true)
  })

  it('rejects a name shorter than the minimum', () => {
    expect(validateContact({ ...good, name: 'A' }).name).toContain(
      String(LIMITS.NAME_MIN),
    )
  })

  it('rejects a name longer than the maximum', () => {
    const errors = validateContact({ ...good, name: 'x'.repeat(LIMITS.NAME_MAX + 1) })
    expect(errors.name).toContain(String(LIMITS.NAME_MAX))
  })

  it('accepts a name exactly at both boundaries', () => {
    expect(validateContact({ ...good, name: 'Jo' }).name).toBeUndefined()
    expect(
      validateContact({ ...good, name: 'x'.repeat(LIMITS.NAME_MAX) }).name,
    ).toBeUndefined()
  })

  it.each([
    'not-an-email',
    'missing@domain',
    'two@@at.com',
    'spaces in@example.com',
    '@example.com',
  ])('rejects malformed email %s', (email) => {
    expect(validateContact({ ...good, email }).email).toBeTruthy()
  })

  it('rejects an oversized email', () => {
    const email = `${'a'.repeat(LIMITS.EMAIL_MAX)}@example.com`
    expect(validateContact({ ...good, email }).email).toContain(
      String(LIMITS.EMAIL_MAX),
    )
  })

  it('rejects a message shorter than the minimum', () => {
    expect(validateContact({ ...good, message: 'too short' }).message).toContain(
      String(LIMITS.MESSAGE_MIN),
    )
  })

  it('rejects an oversized message', () => {
    const message = 'x'.repeat(LIMITS.MESSAGE_MAX + 1)
    expect(validateContact({ ...good, message }).message).toContain(
      String(LIMITS.MESSAGE_MAX),
    )
  })

  it('accepts a message exactly at both boundaries', () => {
    expect(
      validateContact({ ...good, message: 'x'.repeat(LIMITS.MESSAGE_MIN) }).message,
    ).toBeUndefined()
    expect(
      validateContact({ ...good, message: 'x'.repeat(LIMITS.MESSAGE_MAX) }).message,
    ).toBeUndefined()
  })
})

describe('isUuid', () => {
  it('accepts a canonical v4 uuid', () => {
    expect(isUuid('3f2a7c14-9b6d-4e83-9a21-5c7d1e8f40bb')).toBe(true)
  })

  it.each([
    '',
    'not-a-uuid',
    '3f2a7c14-9b6d-4e83-9a21-5c7d1e8f40b',
    '3f2a7c149b6d4e839a215c7d1e8f40bb',
    '00000000-0000-0000-0000-000000000000',
  ])('rejects %s', (value) => {
    expect(isUuid(value)).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isUuid(undefined)).toBe(false)
    expect(isUuid(42)).toBe(false)
  })
})

describe('byteLength', () => {
  it('counts utf-8 bytes, not characters', () => {
    expect(byteLength('abc')).toBe(3)
    expect(byteLength('é')).toBe(2)
  })

  it('a maximum-length submission stays under the body cap', () => {
    const body = JSON.stringify({
      request_id: '3f2a7c14-9b6d-4e83-9a21-5c7d1e8f40bb',
      name: 'x'.repeat(LIMITS.NAME_MAX),
      email: `${'a'.repeat(60)}@example.com`,
      message: 'x'.repeat(LIMITS.MESSAGE_MAX),
      website: '',
    })
    expect(byteLength(body)).toBeLessThan(LIMITS.MAX_BODY_BYTES)
  })
})
