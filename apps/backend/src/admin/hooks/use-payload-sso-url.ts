import { useQuery } from "@tanstack/react-query"
import { sdk } from "@/admin/lib/sdk"

/**
 * URL that signs the current admin into the embedded Payload CMS panel.
 *
 * It carries a token valid for about a minute, so it must never come from a
 * cache: every call fetches a fresh one.
 */
export const usePayloadSsoUrl = () =>
  useQuery({
    queryKey: ["payload-sso"],
    queryFn: async () => {
      const { url } = await sdk.client.fetch<{ url: string }>(
        "/admin/payload-sso"
      )

      return url
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
