import { addShippingMethodToCartWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  assertValidInPostShippingMethodData,
  isInPostProvider,
} from "../inpost/shipping-method-data"

/**
 * Validates the provider-specific `data` sent with
 * `POST /store/carts/:id/shipping-methods` before the core workflow passes it
 * to the fulfillment provider and stores it on the cart's shipping method
 * (and, on checkout, on the order's shipping method).
 *
 * A workflow hook accepts a single handler, so any further validation of
 * added shipping methods belongs in this handler as well.
 */
addShippingMethodToCartWorkflow.hooks.validate(
  async ({ input }, { container }) => {
    const options = input.options ?? []

    if (!options.length) {
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: shippingOptions } = await query.graph({
      entity: "shipping_option",
      fields: ["id", "provider_id", "data"],
      filters: { id: options.map((option) => option.id) },
    })

    const shippingOptionsById = new Map(
      shippingOptions.map((shippingOption) => [
        shippingOption.id,
        shippingOption,
      ])
    )

    for (const option of options) {
      const shippingOption = shippingOptionsById.get(option.id)

      // Unknown options are rejected right after this hook by the core
      // workflow's own shipping option validation.
      if (!shippingOption || !isInPostProvider(shippingOption.provider_id)) {
        continue
      }

      assertValidInPostShippingMethodData(
        shippingOption.data?.id,
        option.data
      )
    }
  }
)
