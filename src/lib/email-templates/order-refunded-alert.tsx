import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  orderId?: string
  customerName?: string | null
  customerEmail?: string | null
  amountRefunded?: number
}

const Refunded = ({ orderId, customerName, customerEmail, amountRefunded = 0 }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Order refunded</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>Studio · Refund processed</Text>
        <Heading style={h1}>Order refunded</Heading>
        <Section style={card}>
          <Text style={label}>Order</Text>
          <Text style={valueMono}>{orderId ? orderId.slice(0, 8).toUpperCase() : '—'}</Text>
          <Text style={label}>Amount refunded</Text>
          <Text style={valueGold}>${amountRefunded.toLocaleString()} CAD</Text>
          <Text style={label}>Customer</Text>
          <Text style={value}>{customerName || '—'}<br/>{customerEmail || '—'}</Text>
        </Section>
        <Text style={note}>Artworks in this order are marked available again and can be re-listed.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Refunded,
  subject: (d: Record<string, any>) => `Refund processed · $${Number(d.amountRefunded || 0).toLocaleString()} CAD`,
  displayName: 'Refund processed (studio)',
  to: 'kiyarisart@gmail.com',
  previewData: { orderId: 'abcd1234', customerName: 'Ada', customerEmail: 'ada@example.com', amountRefunded: 2200 },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '40px 0' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px', backgroundColor: '#0F0E0C', color: '#F4ECDD', borderRadius: '4px' }
const kicker: React.CSSProperties = { color: '#C9A24B', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }
const h1: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '30px', margin: '10px 0 14px' }
const card: React.CSSProperties = { backgroundColor: '#1a1714', border: '1px solid #2a2622', padding: '14px 16px', margin: '8px 0 18px' }
const label: React.CSSProperties = { fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8a8170', margin: '10px 0 2px' }
const value: React.CSSProperties = { fontSize: '14px', color: '#F4ECDD', margin: 0 }
const valueMono: React.CSSProperties = { fontSize: '15px', color: '#F4ECDD', margin: 0, fontFamily: 'monospace' }
const valueGold: React.CSSProperties = { fontSize: '18px', color: '#C9A24B', margin: 0, fontFamily: 'Cormorant Garamond, Georgia, serif' }
const note: React.CSSProperties = { fontSize: '12px', color: '#8a8170', margin: '10px 0 0' }
