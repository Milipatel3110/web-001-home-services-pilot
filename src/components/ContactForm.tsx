import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { newRequestId } from '@/lib/uuid'
import {
  LIMITS,
  hasErrors,
  validateContact,
  type FieldErrors,
} from '@/lib/validation'

/**
 * The published Edge Function endpoint. This is a public URL with no key
 * attached, so it is safe in the bundle. The browser never talks to Windmill
 * or to PostgreSQL: the only call it makes is this one (SOW 5.1).
 */
const ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'stored'; requestId: string }
  | { kind: 'failed'; message: string; retryable: boolean }

const GENERIC_FAILURE =
  'We could not record your enquiry. Nothing has been saved. Please try again in a moment.'

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  /**
   * One request_id per enquiry, held across retries so a submission that is
   * retried after a Windmill or database outage is stored exactly once
   * (SOW 5.2, T7). A new id is minted only after a confirmed store.
   */
  const requestId = useRef<string>(newRequestId())
  const errorSummary = useRef<HTMLDivElement>(null)

  const submitting = status.kind === 'submitting'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const found = validateContact({ name, email, message })
    setErrors(found)
    if (hasErrors(found)) {
      // Client-side rejection: no request is sent, so no row can be created.
      setStatus({ kind: 'idle' })
      requestAnimationFrame(() => errorSummary.current?.focus())
      return
    }

    if (!ENDPOINT) {
      setStatus({
        kind: 'failed',
        message:
          'This deployment has no contact endpoint configured, so the form cannot store anything. See docs/SETUP.md.',
        retryable: false,
      })
      return
    }

    setStatus({ kind: 'submitting' })

    const payload = {
      request_id: requestId.current,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      website: '', // honeypot: real visitors never fill this
    }

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const body = (await response.json().catch(() => null)) as
        | { request_id?: string; status?: string; error?: string; fields?: FieldErrors }
        | null

      if (response.status === 400 && body?.fields) {
        // Server-side validation disagreed with the client copy.
        setErrors(body.fields)
        setStatus({ kind: 'idle' })
        requestAnimationFrame(() => errorSummary.current?.focus())
        return
      }

      // Success is asserted only when the server confirms storage. An HTTP 200
      // with any other body is treated as a failure (SOW 5.1).
      if (response.ok && body?.status === 'received' && body.request_id === requestId.current) {
        setStatus({ kind: 'stored', requestId: requestId.current })
        requestId.current = newRequestId()
        setName('')
        setEmail('')
        setMessage('')
        setErrors({})
        return
      }

      setStatus({
        kind: 'failed',
        message: body?.error ? String(body.error) : GENERIC_FAILURE,
        retryable: true,
      })
    } catch {
      // Network-level failure: we cannot know whether the row was written, so
      // we must not claim success. Retrying reuses the same request_id, and the
      // duplicate guard in the Windmill flow keeps the row count at one.
      setStatus({
        kind: 'failed',
        message: GENERIC_FAILURE,
        retryable: true,
      })
    }
  }

  const invalid = (field: keyof FieldErrors) => (errors[field] ? 'true' : undefined)
  const describedBy = (field: keyof FieldErrors) =>
    errors[field] ? `${field}-error` : undefined

  return (
    <div className="mx-auto w-full max-w-xl">
      {status.kind === 'stored' && (
        <Alert variant="success" className="mb-6">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Enquiry received</AlertTitle>
          <AlertDescription>
            <p>
              Your test enquiry was stored. Reference{' '}
              <code className="font-mono text-xs">{status.requestId}</code>
            </p>
          </AlertDescription>
        </Alert>
      )}

      {status.kind === 'failed' && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Not submitted</AlertTitle>
          <AlertDescription>
            <p>{status.message}</p>
          </AlertDescription>
        </Alert>
      )}

      <div
        ref={errorSummary}
        tabIndex={-1}
        aria-live="polite"
        className="sr-only focus:outline-none"
      >
        {hasErrors(errors) ? 'Please correct the highlighted fields.' : ''}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            maxLength={LIMITS.NAME_MAX + 20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={invalid('name')}
            aria-describedby={describedBy('name')}
            placeholder="Your name"
          />
          {errors.name && (
            <p id="name-error" className="text-sm font-medium text-destructive">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={LIMITS.EMAIL_MAX + 20}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={invalid('email')}
            aria-describedby={describedBy('email')}
            placeholder="name@example.com"
          />
          {errors.email && (
            <p id="email-error" className="text-sm font-medium text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="message">
              Message <span className="text-destructive">*</span>
            </Label>
            <span className="text-xs text-muted-foreground" aria-hidden="true">
              {message.trim().length}/{LIMITS.MESSAGE_MAX}
            </span>
          </div>
          <Textarea
            id="message"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-invalid={invalid('message')}
            aria-describedby={describedBy('message')}
            placeholder={`How can we help? At least ${LIMITS.MESSAGE_MIN} characters.`}
          />
          {errors.message && (
            <p id="message-error" className="text-sm font-medium text-destructive">
              {errors.message}
            </p>
          )}
        </div>

        {/* Honeypot. Off-screen rather than display:none so that bots which
            filter on visibility still fill it. Never shown to visitors. */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitting ? 'Sending…' : 'Contact Us'}
        </Button>

        <p className="text-xs text-muted-foreground">
          Please use harmless test data only. Submissions are stored in a
          demonstration database for the pilot and are not monitored.
        </p>
      </form>
    </div>
  )
}
