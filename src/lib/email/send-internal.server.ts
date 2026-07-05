// Server-only internal email enqueuer.
// Mirrors /lovable/email/transactional/send but skips JWT auth so it can be
// called from public flows (checkout completion). Uses service-role admin client.
import * as React from 'react'
import { render } from 'react-email'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'art by KIYARI'
const SENDER_DOMAIN = 'notify.kiyari.art'
const FROM_DOMAIN = 'kiyari.art'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface InternalSendInput {
  templateName: string
  recipientEmail?: string
  templateData?: Record<string, any>
  idempotencyKey?: string
  /** Optional From override, e.g. "Kiyari <hello@kiyari.art>". */
  fromAddress?: string
}

export async function sendTransactionalEmailInternal(input: InternalSendInput) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const tpl = TEMPLATES[input.templateName]
  if (!tpl) throw new Error(`Template '${input.templateName}' not registered`)

  const to = tpl.to || input.recipientEmail
  if (!to) throw new Error('recipientEmail required (template has no fixed recipient)')

  const messageId = crypto.randomUUID()
  const idempotencyKey = input.idempotencyKey || messageId
  const normalized = to.toLowerCase()

  // Suppression check
  const { data: suppressed } = await supabaseAdmin
    .from('suppressed_emails').select('id').eq('email', normalized).maybeSingle()
  if (suppressed) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId, template_name: input.templateName,
      recipient_email: to, status: 'suppressed',
    })
    return { sent: false, reason: 'suppressed' as const }
  }

  // Unsubscribe token
  let unsubscribeToken: string
  const { data: existing } = await supabaseAdmin
    .from('email_unsubscribe_tokens').select('token, used_at').eq('email', normalized).maybeSingle()
  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token
  } else if (!existing) {
    unsubscribeToken = generateToken()
    await supabaseAdmin.from('email_unsubscribe_tokens').upsert(
      { token: unsubscribeToken, email: normalized },
      { onConflict: 'email', ignoreDuplicates: true },
    )
    const { data: stored } = await supabaseAdmin
      .from('email_unsubscribe_tokens').select('token').eq('email', normalized).maybeSingle()
    unsubscribeToken = stored?.token ?? unsubscribeToken
  } else {
    return { sent: false, reason: 'suppressed' as const }
  }

  const element = React.createElement(tpl.component, input.templateData ?? {})
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(input.templateData ?? {}) : tpl.subject

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId, template_name: input.templateName,
    recipient_email: to, status: 'pending',
  })

  const { error } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId, to,
      from: input.fromAddress || `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject, html, text,
      purpose: 'transactional',
      label: input.templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })
  if (error) throw error
  return { sent: true, messageId }
}
