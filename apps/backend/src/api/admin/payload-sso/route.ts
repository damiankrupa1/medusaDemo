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
    fields: ["id", "email", "first_name", "last_name", "metadata"],
    filters: { id: req.auth_context.actor_id },
  })
  const user = users[0]
  const email = user?.email

  if (!email) {
    res.status(403).json({
      type: "not_allowed",
      message: "The current admin user has no email address",
    })
    return
  }

  const firstName =
    typeof user.first_name === "string" ? user.first_name.trim() : ""
  const lastName =
    typeof user.last_name === "string" ? user.last_name.trim() : ""
  const name = [firstName, lastName].filter(Boolean).join(" ") || undefined

  const payloadRole =
    user.metadata &&
    typeof user.metadata === "object" &&
    "payload_role" in user.metadata &&
    typeof user.metadata.payload_role === "string"
      ? user.metadata.payload_role
    : "admin"

  const role = (
    ["none", "viewer", "editor", "publisher", "admin"] as const
  ).includes(
    payloadRole as "none" | "viewer" | "editor" | "publisher" | "admin"
  )
    ? (payloadRole as "none" | "viewer" | "editor" | "publisher" | "admin")
    : "none"

  res.json({
    url: buildPayloadSsoUrl(
      payloadUrl,
      signPayloadSsoToken(
        {
          sub: String(req.auth_context.actor_id),
          email,
          name,
          role,
          redirect: "/admin",
        },
        secret
      )
    ),
  })
}
