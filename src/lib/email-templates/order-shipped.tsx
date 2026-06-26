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

interface OrderShippedProps {
  customerName?: string;
  orderId?: string;
  trackingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  statusUrl?: string;
}

function OrderShipped({
  customerName,
  orderId,
  trackingCarrier,
  trackingNumber,
  trackingUrl,
  statusUrl,
}: OrderShippedProps) {
  return (
    <Html>
      <Head />
      <Preview>Your art by KIYARI order has shipped</Preview>
      <Body style={{ backgroundColor: "#0a0a0a", color: "#f5f5f0", fontFamily: "Georgia, serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px", backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
          <Text style={{ color: "#c9a961", letterSpacing: "0.3em", fontSize: 11, textTransform: "uppercase", margin: 0 }}>
            art by KIYARI · Calgary
          </Text>
          <Heading style={{ color: "#f5f5f0", fontFamily: "Georgia, serif", fontSize: 32, lineHeight: 1.2, marginTop: 16 }}>
            Your order is on its way
          </Heading>
          <Text style={{ color: "#cccccc", fontSize: 15, lineHeight: 1.6 }}>
            {customerName ? `${customerName}, your` : "Your"} artwork has been carefully packed and handed off to the carrier.
          </Text>

          {(trackingCarrier || trackingNumber) && (
            <Section style={{ marginTop: 24, padding: 20, backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a" }}>
              {trackingCarrier && (
                <Text style={{ color: "#999", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", margin: 0 }}>
                  Carrier
                </Text>
              )}
              {trackingCarrier && (
                <Text style={{ color: "#f5f5f0", fontSize: 15, margin: "4px 0 12px" }}>{trackingCarrier}</Text>
              )}
              {trackingNumber && (
                <Text style={{ color: "#999", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", margin: 0 }}>
                  Tracking number
                </Text>
              )}
              {trackingNumber && (
                <Text style={{ color: "#c9a961", fontSize: 15, fontFamily: "monospace", margin: "4px 0 0" }}>
                  {trackingNumber}
                </Text>
              )}
              {trackingUrl && (
                <Text style={{ marginTop: 16 }}>
                  <Link href={trackingUrl} style={{ color: "#c9a961", textDecoration: "underline", fontSize: 14 }}>
                    Track your shipment →
                  </Link>
                </Text>
              )}
            </Section>
          )}

          {statusUrl && (
            <Text style={{ marginTop: 24 }}>
              <Link href={statusUrl} style={{ color: "#c9a961", textDecoration: "underline", fontSize: 13 }}>
                View order status
              </Link>
            </Text>
          )}

          {orderId && (
            <Text style={{ color: "#666", fontSize: 11, marginTop: 32 }}>
              Order reference: <span style={{ fontFamily: "monospace" }}>{orderId.slice(0, 8).toUpperCase()}</span>
            </Text>
          )}
          <Text style={{ color: "#666", fontSize: 11, marginTop: 8 }}>
            Questions? Reply to this email or reach Kiyari at kiyarisart@gmail.com.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: OrderShipped,
  subject: (data: Record<string, any>) =>
    `Your art by KIYARI order has shipped${data.trackingNumber ? ` · ${data.trackingNumber}` : ""}`,
  displayName: "Order shipped",
  previewData: {
    customerName: "Friend",
    orderId: "abcd1234-...",
    trackingCarrier: "Canada Post",
    trackingNumber: "TRACK123456789",
    trackingUrl: "https://www.canadapost-postescanada.ca/track-reperage/en",
    statusUrl: "https://kiyari.art/orders/abcd1234",
  },
};
