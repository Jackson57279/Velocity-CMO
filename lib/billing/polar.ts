import { Polar } from "@polar-sh/sdk"

import { getPolarServer } from "@/lib/billing/config"

let polarClient: Polar | null | undefined

export function isPolarConfigured(): boolean {
  return typeof process.env.POLAR_ACCESS_TOKEN === "string" && process.env.POLAR_ACCESS_TOKEN.length > 0
}

export function getPolarClient(): Polar | null {
  if (polarClient !== undefined) {
    return polarClient
  }

  if (!isPolarConfigured()) {
    polarClient = null
    return polarClient
  }

  polarClient = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: getPolarServer(),
  })

  return polarClient
}
