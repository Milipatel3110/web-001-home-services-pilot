import { CalendarClock } from 'lucide-react'

/**
 * Version B addition (SOW section 4). Sits directly above the contact form.
 */
export function WeekendCallout() {
  return (
    <div className="mx-auto mt-8 max-w-xl rounded-lg border border-primary/30 bg-primary/5 p-5">
      <div className="flex gap-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CalendarClock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-base font-semibold">Weekend Appointments</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Saturday and Sunday slots are available between 8am and 4pm. Mention
            your preferred day in the message and we will call you back to
            confirm.
          </p>
        </div>
      </div>
    </div>
  )
}
