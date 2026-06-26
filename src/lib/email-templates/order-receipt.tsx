import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface LineItem {
  title: string
  quantity: number
  unit_amount?: number
}

interface Props {
  customerName?: string
  orderId?: string
  items?: LineItem[]
  amountTotal?: number
  shippingAddress?: string
  statusUrl?: string
}

const OrderReceipt = ({ customerName, orderId, items = [], amountTotal = 0, shippingAddress, statusUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your art by KIYARI order is confirmed — thank you.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}>
          <Text style={brandKicker}>art by KIYARI · Order confirmed</Text>
        </Section>
        <Heading style={h1}>Thank you{customerName ? `, ${customerName}` : ''}.</Heading>
        <Text style={lead}>
          We received your payment. Each piece is hand-finished in the Calgary studio
          and prepared for safe transit. You'll get a shipping update within a few days.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Order reference</Text>
          <Text style={cardValueMono}>{orderId ? orderId.slice(0, 8).toUpperCase() : '—'}</Text>
        </Section>

        <Heading style={h2}>Your pieces</Heading>
        {items.map((i, idx) => (
          <Section key={idx} style={lineItem}>
            <Text style={lineTitle}>{i.title}</Text>
            <Text style={lineMeta}>Qty {i.quantity}{i.unit_amount ? ` · $${i.unit_amount.toLocaleString()} CAD` : ''}</Text>
          </Section>
        ))}

        <Hr style={hr} />
        <Section style={totalRow}>
          <Text style={totalLabel}>Total paid</Text>
          <Text style={totalValue}>${amountTotal.toLocaleString()} CAD</Text>
        </Section>

        {shippingAddress && (
          <>
            <Heading style={h2}>Shipping to</Heading>
            <Text style={body}>{shippingAddress}</Text>
          </>
        )}

        {statusUrl && (
          <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
            <Button href={statusUrl} style={btn}>Track your order</Button>
          </Section>
        )}

        <Text style={muted}>
          Questions? Reply to this email or write to{' '}
          <Link href="mailto:kiyarisart@gmail.com" style={link}>kiyarisart@gmail.com</Link>.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderReceipt,
  subject: (data: Record<string, any>) => `Your art by KIYARI order ${data.orderId ? '#' + String(data.orderId).slice(0, 8).toUpperCase() : ''}`.trim(),
  displayName: 'Order receipt',
  previewData: {
    customerName: 'Ada',
    orderId: 'abcd1234-aaaa-bbbb-cccc-1234567890ab',
    items: [{ title: 'Madiba', quantity: 1, unit_amount: 2200 }],
    amountTotal: 2200,
    shippingAddress: '123 Stephen Ave, Calgary, AB, T2P 1J9, CA',
    statusUrl: 'https://kiyari.art/orders/abcd1234',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '40px 0' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px', backgroundColor: '#0F0E0C', color: '#F4ECDD', borderRadius: '4px' }
const brand: React.CSSProperties = { borderBottom: '1px solid #2a2622', paddingBottom: '16px', marginBottom: '20px' }
const brandKicker: React.CSSProperties = { color: '#C9A24B', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }
const h1: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '30px', color: '#F4ECDD', margin: '0 0 14px', lineHeight: 1.2 }
const h2: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '18px', color: '#C9A24B', margin: '22px 0 10px', letterSpacing: '0.05em' }
const lead: React.CSSProperties = { fontSize: '15px', lineHeight: 1.6, color: '#E8DEC8', margin: '0 0 14px' }
const body: React.CSSProperties = { fontSize: '14px', lineHeight: 1.6, color: '#B8AE96', margin: '0 0 14px' }
const card: React.CSSProperties = { backgroundColor: '#1a1714', border: '1px solid #2a2622', padding: '14px 16px', margin: '8px 0 18px' }
const cardLabel: React.CSSProperties = { fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8a8170', margin: '2px 0 4px' }
const cardValueMono: React.CSSProperties = { fontSize: '15px', color: '#C9A24B', margin: 0, fontFamily: 'monospace' }
const lineItem: React.CSSProperties = { padding: '8px 0', borderBottom: '1px solid #1f1c18' }
const lineTitle: React.CSSProperties = { fontSize: '14px', color: '#F4ECDD', margin: 0 }
const lineMeta: React.CSSProperties = { fontSize: '12px', color: '#8a8170', margin: '2px 0 0' }
const hr: React.CSSProperties = { borderColor: '#2a2622', margin: '16px 0' }
const totalRow: React.CSSProperties = { display: 'block' }
const totalLabel: React.CSSProperties = { fontSize: '12px', color: '#8a8170', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }
const totalValue: React.CSSProperties = { fontSize: '20px', color: '#C9A24B', margin: '4px 0 18px', fontFamily: 'Cormorant Garamond, Georgia, serif' }
const btn: React.CSSProperties = { backgroundColor: '#C9A24B', color: '#0F0E0C', padding: '12px 24px', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: '2px' }
const muted: React.CSSProperties = { fontSize: '12px', color: '#8a8170', margin: '14px 0 0' }
const link: React.CSSProperties = { color: '#C9A24B', textDecoration: 'underline' }
