import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { usePayloadSsoUrl } from "@/admin/hooks/use-payload-sso-url"

const CmsPage = () => {
  const { t } = useTranslation()
  const { data: url, isError, error } = usePayloadSsoUrl()

  if (isError) {
    return (
      <Container>
        <Text className="text-ui-fg-error">
          {t("payloadCms.loadFailed")}
          {error instanceof Error && error.message ? `: ${error.message}` : ""}
        </Text>
      </Container>
    )
  }

  if (!url) {
    return (
      <Container>
        <Text className="text-ui-fg-subtle">{t("payloadCms.loading")}</Text>
      </Container>
    )
  }

  return (
    <iframe
      title={t("payloadCms.title")}
      src={url}
      style={{ width: "100%", height: "calc(100vh - 8rem)", border: 0 }}
    />
  )
}

export const config = defineRouteConfig({
  label: "CMS",
})

export default CmsPage
