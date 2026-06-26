import type { ComponentType } from 'react'
import { template as testEmailTemplate } from './test-email'
import { template as orderReceiptTemplate } from './order-receipt'
import { template as orderAdminNotificationTemplate } from './order-admin-notification'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'test-email': testEmailTemplate,
  'order-receipt': orderReceiptTemplate,
  'order-admin-notification': orderAdminNotificationTemplate,
}
