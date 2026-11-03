import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-secondary/40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />
      <div className="container relative py-16 sm:py-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pilot demonstration
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Sample Home Services
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            A fictional handyman business used to demonstrate an end-to-end
            website: built with an AI builder, published automatically, and
            wired to a real validated intake pipeline.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={scrollToContact}>
              Send a test enquiry
            </Button>
            <Button variant="outline" size="lg" onClick={scrollToServices}>
              See the services
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function scrollToContact() {
  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToServices() {
  document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })
}
