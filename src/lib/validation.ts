/**
 * Contact form validation rules — SOW section 5.1.
 *
 * This module is the client-side copy, used for immediate feedback in the
 * browser. The authoritative copy lives in the Supabase Edge Function
 * (supabase/functions/contact-submit/index.ts) and runs server-side on every
 * request. Client validation is a convenience only and is never trusted:
 * a request that bypasses this file is still rejected by the Edge Function.
 *
 * Keep the two copies in sync. The limits below are fixed by the SOW:
 *   name     2–80 characters
 *   email    <= 254 characters, plausible address shape
 *   message  10–1000 characters
 *   total request body <= MAX_BODY_BYTES
 *   request_id must be a canonical UUID
 */

export const LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 80,
  EMAIL_MAX: 254,
  MESSAGE_MIN: 10,
  MESSAGE_MAX: 1000,
  MAX_BODY_BYTES: 8192,
} as const

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Deliberately permissive but structural: one @, no spaces, a dotted domain
// with a 2+ character TLD. Address deliverability is out of scope (no email
// is ever sent), so this only rejects clearly malformed input.
export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/

export type ContactInput = {
  name: string
  email: string
  message: string
}

export type FieldErrors = Partial<Record<keyof ContactInput, string>>

export function validateName(raw: string): string | undefined {
  const name = raw.trim()
  if (name.length === 0) return 'Please enter your name.'
  if (name.length < LIMITS.NAME_MIN)
    return `Name must be at least ${LIMITS.NAME_MIN} characters.`
  if (name.length > LIMITS.NAME_MAX)
    return `Name must be ${LIMITS.NAME_MAX} characters or fewer.`
  return undefined
}

export function validateEmail(raw: string): string | undefined {
  const email = raw.trim()
  if (email.length === 0) return 'Please enter your email address.'
  if (email.length > LIMITS.EMAIL_MAX)
    return `Email must be ${LIMITS.EMAIL_MAX} characters or fewer.`
  if (!EMAIL_RE.test(email))
    return 'Please enter a valid email address, for example name@example.com.'
  return undefined
}

export function validateMessage(raw: string): string | undefined {
  const message = raw.trim()
  if (message.length === 0) return 'Please enter a message.'
  if (message.length < LIMITS.MESSAGE_MIN)
    return `Message must be at least ${LIMITS.MESSAGE_MIN} characters.`
  if (message.length > LIMITS.MESSAGE_MAX)
    return `Message must be ${LIMITS.MESSAGE_MAX} characters or fewer.`
  return undefined
}

export function validateContact(input: ContactInput): FieldErrors {
  const errors: FieldErrors = {}
  const name = validateName(input.name)
  const email = validateEmail(input.email)
  const message = validateMessage(input.message)
  if (name) errors.name = name
  if (email) errors.email = email
  if (message) errors.message = message
  return errors
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
