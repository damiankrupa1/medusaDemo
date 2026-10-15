/// <reference types="jest" />

import { MedusaError } from "@medusajs/framework/utils"
import {
  assertValidInPostShippingMethodData,
  InPostServiceType,
  isInPostProvider,
} from "../shipping-method-data"

const pointDetails = {
  type: ["parcel_locker"],
  address: { line1: "Krakowska 1", line2: "31-062 Kraków" },
  address_details: {
    street: "Krakowska",
    building_number: "1",
    flat_number: null,
    post_code: "31-062",
    city: "Kraków",
    province: "małopolskie",
  },
  location: { latitude: 50.0614, longitude: 19.9366 },
  location_description: "Przy sklepie Żabka",
  opening_hours: "24/7",
}

const expectInvalidData = (fn: () => void, message: RegExp) => {
  expect(fn).toThrow(MedusaError)
  expect(fn).toThrow(message)

  try {
    fn()
  } catch (error) {
    expect((error as MedusaError).type).toEqual(MedusaError.Types.INVALID_DATA)
  }
}

describe("isInPostProvider", () => {
  it("matches providers registered with the InPost identifier", () => {
    expect(isInPostProvider("inpost_inpost")).toBe(true)
    expect(isInPostProvider("inpost_inpost-sandbox")).toBe(true)
  })

  it("does not match other providers", () => {
    expect(isInPostProvider("manual_manual")).toBe(false)
    expect(isInPostProvider("inpostx_inpost")).toBe(false)
    expect(isInPostProvider(undefined)).toBe(false)
    expect(isInPostProvider(null)).toBe(false)
  })
})

describe("assertValidInPostShippingMethodData - locker", () => {
  const validate = (data?: Record<string, unknown>) => () =>
    assertValidInPostShippingMethodData(InPostServiceType.LOCKER, data)

  it("accepts the selected point name alone", () => {
    expect(validate({ target_point: "KRA01M" })).not.toThrow()
  })

  it("accepts the point name together with its details", () => {
    expect(
      validate({ target_point: "KRA01M", target_point_details: pointDetails })
    ).not.toThrow()
  })

  it("accepts point names of PaczkoPunkty containing hyphens", () => {
    expect(validate({ target_point: "POP-KRA123" })).not.toThrow()
  })

  it("accepts details with only the required address", () => {
    expect(
      validate({
        target_point: "WAW22BAPP",
        target_point_details: { address: pointDetails.address },
      })
    ).not.toThrow()
  })

  it("requires target_point", () => {
    expectInvalidData(validate(undefined), /data\.target_point: Required/)
    expectInvalidData(validate({}), /data\.target_point: Required/)
  })

  it("rejects a target_point that is not an InPost point name", () => {
    expectInvalidData(
      validate({ target_point: "kra01m" }),
      /data\.target_point: Expected an InPost point name/
    )
    expectInvalidData(
      validate({ target_point: "KRA 01M" }),
      /data\.target_point: Expected an InPost point name/
    )
    expectInvalidData(
      validate({ target_point: "" }),
      /data\.target_point: Expected an InPost point name/
    )
    expectInvalidData(
      validate({ target_point: "A".repeat(33) }),
      /data\.target_point:/
    )
  })

  it("rejects a non-string target_point", () => {
    expectInvalidData(validate({ target_point: 123 }), /data\.target_point:/)
  })

  it("rejects provider-internal keys the merchant controls", () => {
    expectInvalidData(
      validate({ target_point: "KRA01M", parcel_template: "large" }),
      /data: Unsupported keys: parcel_template/
    )
    expectInvalidData(
      validate({
        target_point: "KRA01M",
        parcel_dimensions: { length: 1, width: 1, height: 1, weight: 0.1 },
        label_format: "zpl",
      }),
      /Unsupported keys: parcel_dimensions, label_format/
    )
  })

  it("rejects details without an address", () => {
    expectInvalidData(
      validate({
        target_point: "KRA01M",
        target_point_details: { opening_hours: "24/7" },
      }),
      /data\.target_point_details\.address:/
    )
  })

  it("rejects unknown keys inside the details", () => {
    expectInvalidData(
      validate({
        target_point: "KRA01M",
        target_point_details: { ...pointDetails, image_url: "https://x.y/z" },
      }),
      /data\.target_point_details: Unrecognized key/
    )
  })

  it("rejects out-of-range coordinates", () => {
    expectInvalidData(
      validate({
        target_point: "KRA01M",
        target_point_details: {
          ...pointDetails,
          location: { latitude: 200, longitude: 19.9 },
        },
      }),
      /data\.target_point_details\.location\.latitude:/
    )
  })

  it("rejects oversized texts", () => {
    expectInvalidData(
      validate({
        target_point: "KRA01M",
        target_point_details: {
          ...pointDetails,
          location_description: "x".repeat(501),
        },
      }),
      /data\.target_point_details\.location_description:/
    )
  })
})

describe("assertValidInPostShippingMethodData - other InPost services", () => {
  it("accepts courier delivery without data", () => {
    expect(() =>
      assertValidInPostShippingMethodData(InPostServiceType.COURIER, undefined)
    ).not.toThrow()
    expect(() =>
      assertValidInPostShippingMethodData(InPostServiceType.COURIER, {})
    ).not.toThrow()
  })

  it("rejects a pickup point for courier delivery", () => {
    expectInvalidData(
      () =>
        assertValidInPostShippingMethodData(InPostServiceType.COURIER, {
          target_point: "KRA01M",
        }),
      /data: Unsupported keys: target_point\. Only InPost locker delivery accepts data/
    )
  })

  it("rejects parcel dimensions sent for courier delivery", () => {
    expectInvalidData(
      () =>
        assertValidInPostShippingMethodData(InPostServiceType.COURIER, {
          parcel_dimensions: { length: 1, width: 1, height: 1, weight: 0.1 },
        }),
      /Unsupported keys: parcel_dimensions/
    )
  })
})
