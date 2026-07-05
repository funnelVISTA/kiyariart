import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Item {
  title: string;
  price?: number;
  unit_amount?: number;
  unit_amount_cad?: number;
}

interface OrderShippedProps {
  customerName?: string;
  orderId?: string;
  items?: Item[];
  trackingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  statusUrl?: string;
}

const firstName = (n?: string) => (n ? n.trim().split(/\s+/)[0] : "there");
const orderNumber = (id?: string) => (id ? id.slice(0, 8).toUpperCase() : "—");

function OrderShipped({
  customerName,
  orderId,
  items = [],
  trackingCarrier,
  trackingNumber,
  trackingUrl,
  statusUrl,
}: OrderShippedProps) {
  const piece = items[0]?.title;
  return (
    <Html>
      <Head />
      <Preview>Your Kiyari creation is on its way ✨</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Inter, Arial, sans-serif", margin: 0, padding: "40px 0" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 28px", backgroundColor: "#0F0E0C", color: "#F4ECDD", borderRadius: 4 }}>
          <Text style={{ color: "#C9A24B", letterSpacing: "0.3em", fontSize: 11, textTransform: "uppercase", margin: 0 }}>
            art by KIYARI · Shipment on the way
          </Text>

          <Heading style={{ color: "#F4ECDD", fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: 30, lineHeight: 1.2, margin: "18px 0 12px" }}>
            Hi {firstName(customerName)},
          </Heading>

          <Text style={{ color: "#E8DEC8", fontSize: 15, lineHeight: 1.6, margin: "0 0 14px" }}>
            Wonderful news — your creation has left the studio and is on its way to you.
          </Text>

          <Section style={{ marginTop: 20, padding: "16px 18px", backgroundColor: "#1a1714", border: "1px solid #2a2622" }}>
            <Text style={{ color: "#8a8170", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.25em", margin: 0 }}>
              Tracking
            </Text>
            <Text style={{ color: "#F4ECDD", fontSize: 15, margin: "6px 0 0" }}>
              {trackingCarrier ?? "Carrier"} — <span style={{ color: "#C9A24B", fontFamily: "monospace" }}>{trackingNumber ?? "—"}</span>
            </Text>
            {trackingUrl && (
              <Text style={{ margin: "10px 0 0" }}>
                <Link href={trackingUrl} style={{ color: "#C9A24B", textDecoration: "underline", fontSize: 13 }}>
                  Track your parcel →
                </Link>
              </Text>
            )}
          </Section>

          {piece && (
            <Section style={{ marginTop: 16 }}>
              <Text style={{ color: "#8a8170", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.25em", margin: 0 }}>
                Your piece
              </Text>
              <Text style={{ color: "#F4ECDD", fontSize: 15, margin: "4px 0 0" }}>{piece}</Text>
            </Section>
          )}

          <Text style={{ color: "#8a8170", fontSize: 12, margin: "10px 0 20px" }}>
            Order #{orderNumber(orderId)}
          </Text>

          <Text style={{ color: "#B8AE96", fontSize: 14, lineHeight: 1.7, margin: "0 0 14px" }}>
            When it arrives, remember — you'll never hear "don't touch" with a Kiyari creation.
            Run your fingers across the textures, feel the story, and let it settle into its new home.
          </Text>

          <Text style={{ color: "#B8AE96", fontSize: 14, lineHeight: 1.7, margin: "0 0 14px" }}>
            Thank you for being part of this. It means everything. We'd love to see where your piece
            lands — reply anytime and send us a photo.
          </Text>

          <Text style={{ color: "#E8DEC8", fontSize: 15, lineHeight: 1.7, margin: "22px 0 0", fontFamily: "Cormorant Garamond, Georgia, serif" }}>
            With love and gratitude,<br />Kiyari
          </Text>

          {statusUrl && (
            <Text style={{ marginTop: 20, fontSize: 12 }}>
              <Link href={statusUrl} style={{ color: "#C9A24B", textDecoration: "underline" }}>
                View your order
              </Link>
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: OrderShipped,
  subject: (data: Record<string, any>) =>
    `Your Kiyari creation is on its way ✨${data.orderId ? ` (Order #${String(data.orderId).slice(0, 8).toUpperCase()})` : ""}`,
  displayName: "Order shipped",
  previewData: {
    customerName: "Ada Chen",
    orderId: "abcd1234-aaaa-bbbb-cccc-1234567890ab",
    items: [{ title: "Madiba", price: 2200 }],
    trackingCarrier: "Canada Post",
    trackingNumber: "TRACK123456789",
    trackingUrl: "https://www.canadapost-postescanada.ca/track-reperage/en",
    statusUrl: "https://kiyari.art/orders/abcd1234",
  },
} satisfies TemplateEntry;
