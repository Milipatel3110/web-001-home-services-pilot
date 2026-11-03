#!/usr/bin/env node
/**
 * Regenerates windmill/contact_intake.flow.json from windmill/contact_intake.ts
 * so the readable source and the deployable export never drift apart.
 *
 *   node scripts/sync-windmill-flow.mjs
 *
 * The output is an OpenFlow document. Import it in Windmill with:
 *   Flows > + New flow > ... menu > Import from JSON
 * or with the CLI:  wmill flow push windmill/contact_intake.flow.json f/web001/contact_intake
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

const content = fs.readFileSync(path.join(root, 'windmill/contact_intake.ts'), 'utf8')

const flow = {
  summary: 'contact_intake',
  description:
    'WEB-001. Synchronous intake flow. Called only by the Supabase contact-submit Edge Function with a scoped bearer token. Writes one row to public.contact_submissions using a server-side Supabase credential, returns the existing row without inserting on a repeated request_id, and always answers with an explicit {stored, request_id}.',
  value: {
    modules: [
      {
        id: 'a',
        summary: 'Store submission (idempotent on request_id)',
        value: {
          type: 'rawscript',
          language: 'bun',
          content,
          input_transforms: {
            request_id: { type: 'javascript', expr: 'flow_input.request_id' },
            name: { type: 'javascript', expr: 'flow_input.name' },
            email: { type: 'javascript', expr: 'flow_input.email' },
            message: { type: 'javascript', expr: 'flow_input.message' },
          },
        },
      },
    ],
  },
  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    required: ['request_id', 'name', 'email', 'message'],
    order: ['request_id', 'name', 'email', 'message'],
    properties: {
      request_id: {
        type: 'string',
        description: 'Client-generated UUID. The idempotency key for this enquiry.',
        format: 'uuid',
      },
      name: { type: 'string', description: 'Submitted name, 2-80 characters.' },
      email: { type: 'string', description: 'Submitted email, up to 254 characters.' },
      message: { type: 'string', description: 'Submitted message, 10-1000 characters.' },
    },
  },
}

// Strip the accidental undefined keys so the JSON stays clean.
const clean = JSON.parse(JSON.stringify(flow))

const out = path.join(root, 'windmill/contact_intake.flow.json')
fs.writeFileSync(out, `${JSON.stringify(clean, null, 2)}\n`)
console.log(`Wrote ${path.relative(root, out)} (${content.length} bytes of script embedded)`)
