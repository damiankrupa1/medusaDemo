import { z } from "zod"

export const PutLocalizedSlugsSchema = z.array(
  z.object({
    locale: z.string().min(1),
    slug: z.string().min(1),
  })
)

export type PutLocalizedSlugsSchemaType = z.infer<typeof PutLocalizedSlugsSchema>
