/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Public URL of the Supabase Edge Function that accepts contact
   * submissions, e.g. https://<project-ref>.supabase.co/functions/v1/contact-submit
   *
   * This is a public endpoint with no key attached, so it is safe to ship in
   * the browser bundle. No Supabase anon key, service key or Windmill token is
   * ever exposed to the client.
   */
  readonly VITE_CONTACT_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
