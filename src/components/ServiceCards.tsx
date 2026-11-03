import { Hammer, Sofa, Wrench } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const SERVICES = [
  {
    title: 'Small Repairs',
    icon: Hammer,
    description: 'Door catches, dripping taps, cracked tiles and the jobs that never make the list.',
    points: ['Leaking taps and showerheads', 'Sticking doors and windows', 'Shelving and wall fixings'],
  },
  {
    title: 'Furniture Assembly',
    icon: Sofa,
    description: 'Flat-pack built properly the first time, levelled, squared and anchored.',
    points: ['Wardrobes and bed frames', 'Desks and office chairs', 'Packaging taken away'],
  },
  {
    title: 'Home Maintenance',
    icon: Wrench,
    description: 'Seasonal upkeep on a schedule, so nothing turns into an emergency.',
    points: ['Gutter and downpipe checks', 'Smoke alarm testing', 'Gate and fence tightening'],
  },
] as const

export function ServiceCards() {
  return (
    <section id="services" className="scroll-mt-16 py-16 sm:py-20">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            What we would do
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Three sample services
          </h2>
          <p className="mt-3 text-muted-foreground">
            Placeholder service descriptions for the demonstration site. Nothing
            here is bookable.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ title, icon: Icon, description, points }) => (
            <Card key={title} className="flex flex-col">
              <CardHeader>
                <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
