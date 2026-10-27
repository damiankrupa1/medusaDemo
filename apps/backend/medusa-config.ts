import { resolve } from "node:path";
import { loadEnv, defineConfig } from "@medusajs/framework/utils";
import { Modules } from "@medusajs/framework/utils";
import { requireSecret } from "./src/config/env";
import { getFileProvider } from "./src/config/file-storage";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const inpostOptions = {
  apiToken: process.env.INPOST_API_TOKEN,
  organizationId: process.env.INPOST_ORGANIZATION_ID,

  sandbox: true,

  defaultParcelTemplate: "small",
  defaultLabelFormat: "pdf",
  returnTokenTtlMinutes: 60,
};

module.exports = defineConfig({
  admin: {
    disable: process.env.ADMIN_DISABLED === "true" || false,
    // "@/..." resolves to "src/..." in admin code. Mirrors `paths` in
    // tsconfig.json and src/admin/tsconfig.json; only the admin bundle
    // resolves it - server code is compiled by plain tsc, which does not
    // rewrite aliases, so it keeps relative imports.
    vite: () => ({
      resolve: { alias: { "@": resolve(process.cwd(), "src") } },
    }),
  },
  featureFlags: {
    translation: true,
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    workerMode:
      (process.env.WORKER_MODE as "shared" | "worker" | "server" | undefined) ||
      "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: requireSecret("JWT_SECRET"),
      cookieSecret: requireSecret("COOKIE_SECRET"),
    },
  },
  plugins: [
    {
      resolve: "medusa-inpost-fulfillment",
      options: inpostOptions,
    },
  ],
  modules: {
    [Modules.PAYMENT]: {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
            },
          },
        ],
      },
    },
    [Modules.EVENT_BUS]: {
      resolve: "@medusajs/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    [Modules.TRANSLATION]: {
      resolve: "@medusajs/medusa/translation",
    },
    localized_slugs: {
      resolve: "./src/modules/localized-slugs",
    },
    [Modules.FILE]: {
      resolve: "@medusajs/medusa/file",
      options: {
        // S3 when S3_* env vars are set, otherwise local storage.
        providers: [getFileProvider()],
      },
    },
    [Modules.FULFILLMENT]: {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "medusa-inpost-fulfillment/providers/inpost",
            id: "inpost",
            options: inpostOptions,
          },
          {
            resolve: "@medusajs/medusa/fulfillment-manual",
            id: "manual",
          },
        ],
      },
    },
  },
});
