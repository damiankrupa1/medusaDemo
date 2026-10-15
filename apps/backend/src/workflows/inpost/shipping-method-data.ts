import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

/**
 * Store-facing contract for the `data` object sent with
 * `POST /store/carts/:id/shipping-methods` when the selected shipping option
 * is fulfilled by the InPost provider (`medusa-inpost-fulfillment`).
 *
 * The InPost provider spreads `data` verbatim into the stored shipping method
 * data, which later feeds the ShipX shipment (`parcel_template`,
 * `parcel_dimensions`, `label_format`, ...). A storefront may therefore only
 * send the pickup point selected by the customer.
 */

/**
 * Identifier of the plugin's fulfillment provider. Medusa stores shipping
 * option providers as `<identifier>_<configured id>` (`inpost_inpost`).
 */
const INPOST_PROVIDER_IDENTIFIER = "inpost"

/** Fulfillment option ids exposed by the InPost provider (`shipping_option.data.id`). */
export const InPostServiceType = {
  LOCKER: "inpost_locker_standard",
  COURIER: "inpost_courier_standard",
} as const

/** InPost point names, e.g. "KRA01M", "WAW22BAPP", "POP-KRA123". */
const TARGET_POINT_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/

const TargetPointSchema = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? 'Required for InPost locker delivery (InPost point name, e.g. "KRA01M")'
        : undefined,
  })
  .max(32)
  .regex(
    TARGET_POINT_PATTERN,
    'Expected an InPost point name made of uppercase letters, digits and hyphens (e.g. "KRA01M")'
  )

const optionalText = (max: number) => z.string().max(max).nullish()

/**
 * Display details of the selected point, in the shape returned by the InPost
 * Geowidget / Points API. They are informational (order summary, admin):
 * InPost routes the parcel by `target_point` alone.
 */
const TargetPointDetailsSchema = z.strictObject({
  type: z.array(z.string().min(1).max(64)).max(10).optional(),
  address: z.strictObject({
    line1: z.string().min(1).max(255),
    line2: z.string().min(1).max(255),
  }),
  address_details: z
    .strictObject({
      street: optionalText(255),
      building_number: optionalText(32),
      flat_number: optionalText(32),
      post_code: optionalText(16),
      city: optionalText(128),
      province: optionalText(128),
    })
    .optional(),
  location: z
    .strictObject({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  location_description: optionalText(500),
  opening_hours: optionalText(255),
})

const LockerShippingMethodDataSchema = z.strictObject(
  {
    target_point: TargetPointSchema,
    target_point_details: TargetPointDetailsSchema.optional(),
  },
  {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Unsupported keys: ${issue.keys.join(", ")}. InPost locker delivery accepts only "target_point" and "target_point_details"`
        : undefined,
  }
)

const NoClientDataSchema = z.strictObject(
  {},
  {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Unsupported keys: ${issue.keys.join(", ")}. Only InPost locker delivery accepts data (the selected pickup point)`
        : undefined,
  }
)

export type InPostTargetPointDetails = z.infer<typeof TargetPointDetailsSchema>

export type InPostLockerShippingMethodData = z.infer<
  typeof LockerShippingMethodDataSchema
>

export function isInPostProvider(providerId: string | null | undefined) {
  return !!providerId?.startsWith(`${INPOST_PROVIDER_IDENTIFIER}_`)
}

/**
 * Validates shipping method `data` sent by a storefront for an InPost
 * shipping option. `serviceType` is the option's `data.id`: only the locker
 * service accepts data, and it requires the selected `target_point`.
 */
export function assertValidInPostShippingMethodData(
  serviceType: unknown,
  data: Record<string, unknown> | undefined
): void {
  const schema =
    serviceType === InPostServiceType.LOCKER
      ? LockerShippingMethodDataSchema
      : NoClientDataSchema

  const result = schema.safeParse(data ?? {})

  if (!result.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid InPost shipping method data - ${formatIssues(result.error.issues)}`
    )
  }
}

function formatIssues(issues: z.ZodError["issues"]) {
  return issues
    .map(
      (issue) =>
        `${["data", ...issue.path.map(String)].join(".")}: ${issue.message}`
    )
    .join("; ")
}
