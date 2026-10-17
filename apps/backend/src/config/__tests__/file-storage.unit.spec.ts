/// <reference types="jest" />

import { logger } from "@medusajs/framework/logger"
import { getFileProvider } from "../file-storage"

const s3Env = {
  S3_FILE_URL: "https://files.example.com",
  S3_ACCESS_KEY_ID: "key",
  S3_SECRET_ACCESS_KEY: "secret",
  S3_BUCKET: "bucket",
}

describe("getFileProvider", () => {
  let warn: jest.SpyInstance

  beforeEach(() => {
    warn = jest.spyOn(logger, "warn").mockImplementation(() => undefined as any)
  })

  afterEach(() => {
    warn.mockRestore()
  })

  it("uses S3 when all required S3 vars are set", () => {
    const provider = getFileProvider({
      ...s3Env,
      S3_ENDPOINT: "https://storage.railway.app",
    })

    expect(provider).toEqual({
      resolve: "@medusajs/medusa/file-s3",
      id: "s3",
      options: {
        file_url: "https://files.example.com",
        access_key_id: "key",
        secret_access_key: "secret",
        region: "us-east-1",
        bucket: "bucket",
        endpoint: "https://storage.railway.app",
        acl: false,
        download_file_duration: 86400,
        additional_client_config: { forcePathStyle: false },
      },
    })
    expect(warn).not.toHaveBeenCalled()
  })

  it("passes through optional S3 settings", () => {
    const { options } = getFileProvider({
      ...s3Env,
      S3_REGION: "auto",
      S3_ACL: "public-read",
      S3_FORCE_PATH_STYLE: "true",
    })

    expect(options).toMatchObject({
      region: "auto",
      acl: "public-read",
      additional_client_config: { forcePathStyle: true },
    })
  })

  it("uses local storage on localhost when S3 is not configured", () => {
    expect(getFileProvider({})).toEqual({
      resolve: "@medusajs/medusa/file-local",
      id: "local",
      options: { backend_url: "http://localhost:9000/static" },
    })
    expect(warn).not.toHaveBeenCalled()
  })

  it("builds local file URLs from the public backend URL", () => {
    expect(
      getFileProvider({ RAILWAY_PUBLIC_DOMAIN: "api.up.railway.app" }).options
    ).toEqual({ backend_url: "https://api.up.railway.app/static" })

    expect(
      getFileProvider({
        BACKEND_PUBLIC_URL: "https://api.example.com",
        RAILWAY_PUBLIC_DOMAIN: "api.up.railway.app",
      }).options
    ).toEqual({ backend_url: "https://api.example.com/static" })
  })

  it("warns and falls back to local storage when S3 is partially configured", () => {
    const provider = getFileProvider({ ...s3Env, S3_BUCKET: undefined })

    expect(provider.id).toBe("local")
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("missing: S3_BUCKET")
    )
  })

  it("warns when only S3_ENDPOINT is set", () => {
    getFileProvider({ S3_ENDPOINT: "https://storage.railway.app" })

    expect(warn).toHaveBeenCalledTimes(1)
  })
})
