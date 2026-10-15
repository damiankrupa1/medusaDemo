const { MetadataStorage } = require("@medusajs/framework/mikro-orm/core")

// MikroORM keeps entity metadata in a process-wide storage. Without clearing
// it, every spec file after the first one in the same Jest process fails to
// load the Medusa modules.
MetadataStorage.clear()

jest.setTimeout(60 * 1000)
