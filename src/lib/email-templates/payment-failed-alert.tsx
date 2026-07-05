import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  paymentIntentId?: string
  customerEmail?: string | null
  amount?: number
  failureMessage?: string
}

const Failed = ({ paymentIntentId, customerEmail, amount = 0, failureMessage }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment failed on art by KIYARI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>Studio · Payment failed</Text>
        <Heading style={h1}>A payment attempt failed</Heading>
        <Section style={card}>
          <Text style={label}>Amount</Text>
          <Text style={valueGold}>${amount.toLocaleString()} CAD</Text>
          <Text style={label}>Customer email</Text>
          <Text style={value}>{customerEmail || '—'}</Text>
          <Text style={label}>Reason</Text>
          <Text style={value}>{failureMessage || 'Unknown'}</Text>
          <Text style={label}>Payment intent</Text>
          <Text style={valueMono}>{paymentIntentId || '—'}</Text>
        </Section>
        <Text style={note}>No action required — Stripe will not charge the buyer. Follow up if you'd like.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Failed,
  subject: () => 'Payment attempt failed',
  displayName: 'Payment failed (studio)',
  to: 'kiyarisart@gmail.com',
  previewData: { paymentIntentId: 'pi_123', customerEmail: 'ada@example.com', amount: 1800, failureMessage: 'Your card was declined.' },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '40px 0' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px', backgroundColor: '#0F0E0C', color: '#F4ECDD', borderRadius: '4px' }
const kicker: React.CSSProperties = { color: '#e0745a', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }
const h1: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '30px', margin: '10px 0 14px' }
const card: React.CSSProperties = { backgroundColor: '#1a1714', border: '1px solid #2a2622', padding: '14px 16px', margin: '8px 0 18px' }
const label: React.CSSProperties = { fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8a8170', margin: '10px 0 2px' }
const value: React.CSSProperties = { fontSize: '14px', color: '#F4ECDD', margin: 0 }
const valueMono: React.CSSProperties = { fontSize: '15px', color: '#F4ECDD', margin: 0, fontFamily: 'monospace' }
const valueGold: React.CSSProperties = { fontSize: '18px', color: '#C9A24B', margin: 0, fontFamily: 'Cormorant Garamond, Georgia, serif' }
const note: React.CSSProperties = { fontSize: '12px', color: '#8a8170', margin: '10px 0 0' }
