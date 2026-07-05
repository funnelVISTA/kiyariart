import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  orderId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  conflictingTitles?: string[]
  amountTotal?: number
  adminUrl?: string
}

const DoubleSale = ({ orderId, customerName, customerEmail, customerPhone, conflictingTitles = [], amountTotal = 0, adminUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>⚠️ Double-sale detected — refund required</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>Studio · Urgent</Text>
        <Heading style={h1}>Double-sale alert ⚠️</Heading>
        <Text style={lead}>
          A collector paid for a piece that was already sold. You must refund this order
          in Stripe (or use the Refund button on the admin order page).
        </Text>
        <Section style={card}>
          <Text style={label}>Conflicting piece(s)</Text>
          {conflictingTitles.map((t, i) => <Text key={i} style={value}>· {t}</Text>)}
          <Text style={label}>Order</Text>
          <Text style={valueMono}>{orderId ? orderId.slice(0, 8).toUpperCase() : '—'}</Text>
          <Text style={label}>Amount to refund</Text>
          <Text style={valueGold}>${amountTotal.toLocaleString()} CAD</Text>
          <Text style={label}>Customer</Text>
          <Text style={value}>{customerName || '—'}<br/>{customerEmail || '—'}<br/>{customerPhone || ''}</Text>
        </Section>
        {adminUrl && (
          <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            <Button href={adminUrl} style={btn}>Open order in admin</Button>
          </Section>
        )}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DoubleSale,
  subject: () => '⚠️ Double-sale — refund required',
  displayName: 'Double-sale alert (studio)',
  to: 'kiyarisart@gmail.com',
  previewData: {
    orderId: 'abcd1234',
    customerName: 'Ada Lovelace',
    customerEmail: 'ada@example.com',
    customerPhone: '+1 403 555 0101',
    conflictingTitles: ['Madiba'],
    amountTotal: 2200,
    adminUrl: 'https://kiyari.art/admin',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '40px 0' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px', backgroundColor: '#0F0E0C', color: '#F4ECDD', borderRadius: '4px' }
const kicker: React.CSSProperties = { color: '#e0745a', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }
const h1: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '30px', margin: '10px 0 14px' }
const lead: React.CSSProperties = { fontSize: '15px', lineHeight: 1.6, color: '#E8DEC8', margin: '0 0 14px' }
const card: React.CSSProperties = { backgroundColor: '#1a1714', border: '1px solid #2a2622', padding: '14px 16px', margin: '8px 0 18px' }
const label: React.CSSProperties = { fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8a8170', margin: '10px 0 2px' }
const value: React.CSSProperties = { fontSize: '14px', color: '#F4ECDD', margin: 0 }
const valueMono: React.CSSProperties = { fontSize: '15px', color: '#F4ECDD', margin: 0, fontFamily: 'monospace' }
const valueGold: React.CSSProperties = { fontSize: '18px', color: '#C9A24B', margin: 0, fontFamily: 'Cormorant Garamond, Georgia, serif' }
const btn: React.CSSProperties = { backgroundColor: '#C9A24B', color: '#0F0E0C', padding: '12px 24px', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: '2px' }
