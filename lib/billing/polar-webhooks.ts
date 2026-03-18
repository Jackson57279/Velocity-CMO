import type { MetadataOutputType } from "@polar-sh/sdk/models/components/metadataoutputtype"
import type { OrderSubscription } from "@polar-sh/sdk/models/components/ordersubscription"
import type { Subscription } from "@polar-sh/sdk/models/components/subscription"
import type { WebhookOrderPaidPayload } from "@polar-sh/sdk/models/components/webhookorderpaidpayload"
import type { WebhookSubscriptionActivePayload } from "@polar-sh/sdk/models/components/webhooksubscriptionactivepayload"
import type { WebhookSubscriptionCanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncanceledpayload"
import type { WebhookSubscriptionRevokedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionrevokedpayload"
import type { WebhookSubscriptionUpdatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionupdatedpayload"

import type { BillingSubscriptionStatus } from "@/lib/billing/config"
import {
  downgradeOrganizationToFree,
  syncOrganizationBillingFromSubscription,
} from "@/lib/billing/store"

function readMetadataString(
  metadata: Record<string, MetadataOutputType> | undefined,
  key: string,
): string | null {
  const value = metadata?.[key]

  return typeof value === "string" && value.length > 0 ? value : null
}

function getOrganizationIdFromMetadata(
  metadata: Record<string, MetadataOutputType> | undefined,
): string | null {
  return readMetadataString(metadata, "referenceId") ?? readMetadataString(metadata, "organizationId")
}

function normalizeSubscriptionStatus(status: string): BillingSubscriptionStatus {
  switch (status) {
    case "active":
      return "active"
    case "trialing":
      return "trialing"
    case "past_due":
      return "past_due"
    case "canceled":
      return "canceled"
    default:
      return "inactive"
  }
}

async function syncFromSubscription(
  subscription: Pick<
    Subscription,
    "checkoutId" | "currentPeriodEnd" | "currentPeriodStart" | "customerId" | "id" | "metadata" | "productId" | "status"
  >,
): Promise<void> {
  const organizationId = getOrganizationIdFromMetadata(subscription.metadata)

  if (!organizationId) {
    return
  }

  await syncOrganizationBillingFromSubscription({
    organizationId,
    status: normalizeSubscriptionStatus(subscription.status),
    polarCustomerId: subscription.customerId,
    polarSubscriptionId: subscription.id,
    polarProductId: subscription.productId,
    polarCheckoutId: subscription.checkoutId,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
  })
}

async function syncFromOrderSubscription(subscription: OrderSubscription): Promise<void> {
  const organizationId = getOrganizationIdFromMetadata(subscription.metadata)

  if (!organizationId) {
    return
  }

  await syncOrganizationBillingFromSubscription({
    organizationId,
    status: normalizeSubscriptionStatus(subscription.status),
    polarCustomerId: subscription.customerId,
    polarSubscriptionId: subscription.id,
    polarProductId: subscription.productId,
    polarCheckoutId: subscription.checkoutId,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
  })
}

export async function handlePolarSubscriptionActive(
  payload: WebhookSubscriptionActivePayload,
): Promise<void> {
  await syncFromSubscription(payload.data)
}

export async function handlePolarSubscriptionUpdated(
  payload: WebhookSubscriptionUpdatedPayload,
): Promise<void> {
  await syncFromSubscription(payload.data)
}

export async function handlePolarSubscriptionCanceled(
  payload: WebhookSubscriptionCanceledPayload,
): Promise<void> {
  await syncFromSubscription(payload.data)
}

export async function handlePolarSubscriptionRevoked(
  payload: WebhookSubscriptionRevokedPayload,
): Promise<void> {
  const organizationId = getOrganizationIdFromMetadata(payload.data.metadata)

  if (!organizationId) {
    return
  }

  await downgradeOrganizationToFree(organizationId, "revoked")
}

export async function handlePolarOrderPaid(payload: WebhookOrderPaidPayload): Promise<void> {
  if (payload.data.subscription) {
    await syncFromOrderSubscription(payload.data.subscription)
  }
}
