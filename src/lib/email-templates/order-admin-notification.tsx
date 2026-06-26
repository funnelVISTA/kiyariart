import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface LineItem { title: string; quantity: number; unit_amount?: number }

interface Props {
  orderId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  items?: LineItem[]
  amountTotal?: number
  shippingAddress?: string
  adminUrl?: string
}

const AdminNotice = ({ orderId, customerName, customerEmail, customerPhone, items = [], amountTotal = 0, shippingAddress, adminUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New paid order on art by KIYARI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}>
          <Text style={brandKicker}>Studio · New paid order</Text>
        </Section>
        <Heading style={h1}>A piece just sold ✦</Heading>
        <Text style={lead}>
          {customerName || 'A new collector'} completed checkout. Details below — prepare for fulfillment.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Order</Text>
          <Text style={cardValueMono}>{orderId ? orderId.slice(0, 8).toUpperCase() : '—'}</Text>
          <Text style={cardLabel}>Total</Text>
          <Text style={cardValueGold}>${amountTotal.toLocaleString()} CAD</Text>
        </Section>

        <Heading style={h2}>Items</Heading>
        {items.map((i, idx) => (
          <Section key={idx} style={lineItem}>
            <Text style={lineTitle}>{i.title}</Text>
            <Text style={lineMeta}>Qty {i.quantity}{i.unit_amount ? ` · $${i.unit_amount.toLocaleString()} CAD` : ''}</Text>
          </Section>
        ))}

        <Hr style={hr} />

        <Heading style={h2}>Customer</Heading>
        <Text style={body}>
          {customerName || '—'}<br />
          {customerEmail || '—'}<br />
          {customerPhone || ''}
        </Text>

        {shippingAddress && (
          <>
            <Heading style={h2}>Ship to</Heading>
            <Text style={body}>{shippingAddress}</Text>
          </>
        )}

        {adminUrl && (
          <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            <Button href={adminUrl} style={btn}>Open admin dashboard</Button>
          </Section>
        )}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminNotice,
  subject: (data: Record<string, any>) =>
    `New order · $${Number(data.amountTotal || 0).toLocaleString()} CAD`,
  displayName: 'New order (studio notification)',
  to: 'kiyarisart@gmail.com',
  previewData: {
    orderId: 'abcd1234-aaaa-bbbb-cccc-1234567890ab',
    customerName: 'Ada Lovelace',
    customerEmail: 'ada@example.com',
    customerPhone: '+1 403 555 0101',
    items: [{ title: 'Madiba', quantity: 1, unit_amount: 2200 }],
    amountTotal: 2200,
    shippingAddress: '123 Stephen Ave, Calgary, AB, T2P 1J9, CA',
    adminUrl: 'https://kiyari.art/admin',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '40px 0' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px', backgroundColor: '#0F0E0C', color: '#F4ECDD', borderRadius: '4px' }
const brand: React.CSSProperties = { borderBottom: '1px solid #2a2622', paddingBottom: '16px', marginBottom: '20px' }
const brandKicker: React.CSSProperties = { color: '#C9A24B', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }
const h1: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '30px', color: '#F4ECDD', margin: '0 0 14px', lineHeight: 1.2 }
const h2: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '18px', color: '#C9A24B', margin: '22px 0 10px' }
const lead: React.CSSProperties = { fontSize: '15px', lineHeight: 1.6, color: '#E8DEC8', margin: '0 0 14px' }
const body: React.CSSProperties = { fontSize: '14px', lineHeight: 1.6, color: '#E8DEC8', margin: '0 0 14px' }
const card: React.CSSProperties = { backgroundColor: '#1a1714', border: '1px solid #2a2622', padding: '14px 16px', margin: '8px 0 18px' }
const cardLabel: React.CSSProperties = { fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8a8170', margin: '6px 0 2px' }
const cardValueMono: React.CSSProperties = { fontSize: '15px', color: '#F4ECDD', margin: 0, fontFamily: 'monospace' }
const cardValueGold: React.CSSProperties = { fontSize: '18px', color: '#C9A24B', margin: 0, fontFamily: 'Cormorant Garamond, Georgia, serif' }
const lineItem: React.CSSProperties = { padding: '8px 0', borderBottom: '1px solid #1f1c18' }
const lineTitle: React.CSSProperties = { fontSize: '14px', color: '#F4ECDD', margin: 0 }
const lineMeta: React.CSSProperties = { fontSize: '12px', color: '#8a8170', margin: '2px 0 0' }
const hr: React.CSSProperties = { borderColor: '#2a2622', margin: '16px 0' }
const btn: React.CSSProperties = { backgroundColor: '#C9A24B', color: '#0F0E0C', padding: '12px 24px', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: '2px' }
