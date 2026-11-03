import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ContactForm } from '@/components/ContactForm'
import { Hero } from '@/components/Hero'
import { ServiceCards } from '@/components/ServiceCards'

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Demonstration notice — visible on every viewport, above the fold. */}
      <div className="bg-accent text-accent-foreground">
        <div className="container flex items-center justify-center gap-2 py-2.5 text-center text-sm font-semibold">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Demonstration only — no services offered</span>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-4">
          <span className="font-bold tracking-tight">Sample Home Services</span>
          <nav className="flex items-center gap-5 text-sm font-medium text-muted-foreground">
            <a href="#services" className="hover:text-foreground">
              Services
            </a>
            <a href="#contact" className="hover:text-foreground">
              Contact
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Hero />
        <ServiceCards />

        <section id="contact" className="scroll-mt-16 border-t border-border bg-secondary/30 py-16 sm:py-20">
          <div className="container">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact us</h2>
              <p className="mt-3 text-muted-foreground">
                Send a test enquiry. It travels from this page to a validating
                function, through a workflow, into a database.
              </p>
            </div>

            <Alert className="mx-auto mt-8 max-w-xl" variant="warning">
              <Info aria-hidden="true" />
              <AlertDescription>
                <p>
                  Demonstration only — no services offered. Please do not enter
                  real personal details.
                </p>
              </AlertDescription>
            </Alert>

            <div className="mt-8">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>Sample Home Services — Demo. A fictional business.</p>
          <p>Demonstration only — no services offered.</p>
        </div>
      </footer>
    </div>
  )
}
