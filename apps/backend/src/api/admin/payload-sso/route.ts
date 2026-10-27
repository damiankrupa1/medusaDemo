import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { buildPayloadSsoUrl, signPayloadSsoToken } from "../../../utils/payload-sso"

/**
 * Returns a short-lived URL that signs the current admin into the Payload CMS
 * admin panel embedded in the Medusa admin (see the "CMS" page).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const payloadUrl = process.env.PAYLOAD_PUBLIC_URL
  const secret = process.env.PAYLOAD_SSO_SECRET

  if (!payloadUrl || !secret) {
    res.status(503).json({
      type: "not_configured",
      message:
        "Payload CMS SSO is not configured: set PAYLOAD_PUBLIC_URL and PAYLOAD_SSO_SECRET",
    })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: users } = await query.graph({
    entity: "user",
    fields: ["email"],
    filters: { id: req.auth_context.actor_id },
  })
  const email = users[0]?.email

  if (!email) {
    res.status(403).json({
      type: "not_allowed",
      message: "The current admin user has no email address",
    })
    return
  }

  res.json({
    url: buildPayloadSsoUrl(payloadUrl, signPayloadSsoToken(email, secret)),
  })
}
