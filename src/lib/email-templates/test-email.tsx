import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  recipientName?: string
}

const TestEmail = ({ recipientName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Test email from art by KIYARI — your sending domain is live.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}>
          <Text style={brandKicker}>art by KIYARI · Studio</Text>
        </Section>
        <Heading style={h1}>Your email setup works ✦</Heading>
        <Text style={lead}>
          {recipientName ? `Hi ${recipientName},` : 'Hi there,'} this is a test message
          confirming that <strong>notify.kiyari.art</strong> is delivering mail successfully.
        </Text>
        <Text style={body}>
          From here, the studio can receive order notifications, password resets,
          and subscriber confirmations — all from your own branded sender.
        </Text>
        <Section style={card}>
          <Text style={cardLabel}>Sender</Text>
          <Text style={cardValue}>noreply@kiyari.art</Text>
          <Text style={cardLabel}>Domain</Text>
          <Text style={cardValue}>notify.kiyari.art</Text>
        </Section>
        <Text style={muted}>
          You can ignore this message — no action required.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TestEmail,
  subject: 'Test email from art by KIYARI',
  displayName: 'Test email',
  previewData: { recipientName: 'Kiyari' },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '40px 0' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px', backgroundColor: '#0F0E0C', color: '#F4ECDD', borderRadius: '4px' }
const brand: React.CSSProperties = { borderBottom: '1px solid #2a2622', paddingBottom: '16px', marginBottom: '24px' }
const brandKicker: React.CSSProperties = { color: '#C9A24B', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }
const h1: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '32px', color: '#F4ECDD', margin: '0 0 16px', lineHeight: 1.2 }
const lead: React.CSSProperties = { fontSize: '15px', lineHeight: 1.6, color: '#E8DEC8', margin: '0 0 14px' }
const body: React.CSSProperties = { fontSize: '14px', lineHeight: 1.6, color: '#B8AE96', margin: '0 0 24px' }
const card: React.CSSProperties = { backgroundColor: '#1a1714', border: '1px solid #2a2622', padding: '16px 18px', margin: '8px 0 24px' }
const cardLabel: React.CSSProperties = { fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8a8170', margin: '6px 0 2px' }
const cardValue: React.CSSProperties = { fontSize: '14px', color: '#C9A24B', margin: '0 0 4px', fontFamily: 'monospace' }
const muted: React.CSSProperties = { fontSize: '12px', color: '#8a8170', margin: 0 }
