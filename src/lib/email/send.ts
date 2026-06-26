import { supabase } from '@/integrations/supabase/client'

export interface SendTransactionalEmailInput {
  templateName: string
  recipientEmail?: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

/**
 * Send a transactional email by posting to the internal email route.
 * Requires the user to be signed in (uses their Supabase JWT).
 */
export async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You must be signed in to send email.')

  const res = await fetch('/lovable/email/transactional/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.error || `Email request failed (${res.status})`)
  }
  return json
}
