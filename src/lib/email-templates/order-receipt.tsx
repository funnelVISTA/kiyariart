import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface LineItem {
  title: string
  quantity?: number
  qty?: number
  unit_amount?: number
  price?: number
  unit_amount_cad?: number
}

interface Props {
  customerName?: string
  orderId?: string
  items?: LineItem[]
  amountTotal?: number
  shippingAddress?: string
  statusUrl?: string
}

const firstName = (n?: string) => (n ? n.trim().split(/\s+/)[0] : 'there')
const orderNumber = (id?: string) => (id ? id.slice(0, 8).toUpperCase() : '—')
const money = (n: number) => `$${Number(n || 0).toLocaleString()} CAD`
const itemPrice = (i: LineItem) => Number(i.price ?? i.unit_amount ?? i.unit_amount_cad ?? 0)

const OrderReceipt = ({ customerName, orderId, items = [], amountTotal = 0, statusUrl }: Props) => {
  const dateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Kiyari order is confirmed 🖤</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brand}>
            <Text style={brandKicker}>art by KIYARI · Order confirmed</Text>
          </Section>
          <Heading style={h1}>Hi {firstName(customerName)},</Heading>
          <Text style={lead}>
            Thank you for giving one of Kiyari's creations a new home. Your order is confirmed.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Order #{orderNumber(orderId)}</Text>
            <Text style={cardMeta}>{dateStr}</Text>
          </Section>

          {items.map((i, idx) => (
            <Section key={idx} style={lineItem}>
              <Text style={lineTitle}>• {i.title}{itemPrice(i) ? ` — ${money(itemPrice(i))}` : ''}</Text>
            </Section>
          ))}

          <Hr style={hr} />
          <Section>
            <Text style={totalLabel}>Total</Text>
            <Text style={totalValue}>{money(amountTotal)}</Text>
          </Section>

          <Text style={body}>
            Each piece is one of one, and yours is now reserved for you.
          </Text>

          <Section style={stepsWrap}>
            <Text style={stepsHeader}>What happens next</Text>
            <Section style={step}>
              <Text style={stepTitle}><span style={stepNum}>01</span>&nbsp; Kiyari prepares your piece</Text>
              <Text style={stepBody}>Your work is inspected, signed, and packaged by hand within 2–3 business days.</Text>
            </Section>
            <Section style={step}>
              <Text style={stepTitle}><span style={stepNum}>02</span>&nbsp; Shipping details</Text>
              <Text style={stepBody}>You'll receive a separate email from Kiyari with tracking information as soon as your piece ships.</Text>
            </Section>
            <Section style={step}>
              <Text style={stepTitle}><span style={stepNum}>03</span>&nbsp; Delivery & unboxing</Text>
              <Text style={stepBody}>Your artwork arrives insured and ready to display. We'd love to see it in its new home — tag @kiyari.art.</Text>
            </Section>
          </Section>

          <Text style={body}>
            Questions about your order? Just reply to this email — we read every message.
          </Text>

          <Text style={sign}>With gratitude,<br />Art by Kiyari</Text>

          {statusUrl && (
            <Text style={muted}>
              <Link href={statusUrl} style={link}>View your order</Link>
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderReceipt,
  subject: (data: Record<string, any>) =>
    `Your Kiyari order is confirmed 🖤${data.orderId ? ` (Order #${String(data.orderId).slice(0, 8).toUpperCase()})` : ''}`,
  displayName: 'Order receipt',
  previewData: {
    customerName: 'Ada Chen',
    orderId: 'abcd1234-aaaa-bbbb-cccc-1234567890ab',
    items: [{ title: 'Madiba', quantity: 1, price: 2200 }],
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
const lead: React.CSSProperties = { fontSize: '15px', lineHeight: 1.6, color: '#E8DEC8', margin: '0 0 14px' }
const body: React.CSSProperties = { fontSize: '14px', lineHeight: 1.7, color: '#B8AE96', margin: '14px 0' }
const sign: React.CSSProperties = { fontSize: '15px', lineHeight: 1.7, color: '#E8DEC8', margin: '22px 0 0', fontFamily: 'Cormorant Garamond, Georgia, serif' }
const card: React.CSSProperties = { backgroundColor: '#1a1714', border: '1px solid #2a2622', padding: '14px 16px', margin: '8px 0 18px' }
const cardLabel: React.CSSProperties = { fontSize: '14px', color: '#C9A24B', margin: '0 0 4px', fontFamily: 'Cormorant Garamond, Georgia, serif', letterSpacing: '0.05em' }
const cardMeta: React.CSSProperties = { fontSize: '11px', color: '#8a8170', margin: 0 }
const lineItem: React.CSSProperties = { padding: '6px 0' }
const lineTitle: React.CSSProperties = { fontSize: '14px', color: '#F4ECDD', margin: 0 }
const hr: React.CSSProperties = { borderColor: '#2a2622', margin: '16px 0' }
const totalLabel: React.CSSProperties = { fontSize: '12px', color: '#8a8170', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }
const totalValue: React.CSSProperties = { fontSize: '22px', color: '#C9A24B', margin: '4px 0 18px', fontFamily: 'Cormorant Garamond, Georgia, serif' }
const muted: React.CSSProperties = { fontSize: '12px', color: '#8a8170', margin: '18px 0 0' }
const link: React.CSSProperties = { color: '#C9A24B', textDecoration: 'underline' }
const stepsWrap: React.CSSProperties = { backgroundColor: '#1a1714', border: '1px solid #2a2622', padding: '18px 18px 6px', margin: '18px 0 8px' }
const stepsHeader: React.CSSProperties = { fontSize: '11px', color: '#C9A24B', textTransform: 'uppercase', letterSpacing: '0.3em', margin: '0 0 12px' }
const step: React.CSSProperties = { margin: '0 0 12px' }
const stepTitle: React.CSSProperties = { fontSize: '14px', color: '#F4ECDD', margin: '0 0 4px', fontFamily: 'Cormorant Garamond, Georgia, serif' }
const stepNum: React.CSSProperties = { color: '#8a8170', fontSize: '11px', letterSpacing: '0.15em', fontFamily: 'Inter, Arial, sans-serif' }
const stepBody: React.CSSProperties = { fontSize: '13px', lineHeight: 1.6, color: '#B8AE96', margin: 0 }
