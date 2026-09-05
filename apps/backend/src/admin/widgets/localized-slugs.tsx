import { useEffect, useMemo, useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"

type ProductWidgetProps = {
  data: { id: string }
}

type LocalizedSlugEntry = {
  locale: string
  slug: string
}

type StoreLocale = {
  locale_code: string
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      typeof body?.message === "string" ? body.message : response.statusText
    throw new Error(message)
  }

  return body as T
}

const LocalizedSlugsWidget = ({ data }: ProductWidgetProps) => {
  const [slugs, setSlugs] = useState<LocalizedSlugEntry[]>([])
  const [supportedLocales, setSupportedLocales] = useState<string[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchJson<{ localized_slugs: LocalizedSlugEntry[] }>(
      `/admin/products/${data.id}/localized-slugs`
    )
      .then((res) => setSlugs(res.localized_slugs))
      .catch(() => {
        // Widget stays empty; the drawer will still let the user try again.
      })

    fetchJson<{ stores: { supported_locales?: StoreLocale[] }[] }>(
      "/admin/stores"
    )
      .then((res) => {
        const locales = res.stores[0]?.supported_locales ?? []
        setSupportedLocales(locales.map((l) => l.locale_code))
      })
      .catch(() => {
        // No supported locales configured (or translation feature off) -
        // the drawer will simply have no locale inputs to show.
      })
  }, [data.id])

  const openDrawer = () => {
    const initialDraft: Record<string, string> = {}
    for (const locale of supportedLocales) {
      initialDraft[locale] =
        slugs.find((s) => s.locale === locale)?.slug ?? ""
    }
    setDraft(initialDraft)
    setIsOpen(true)
  }

  const handleSave = async () => {
    const payload = Object.entries(draft)
      .map(([locale, slug]) => ({ locale, slug: slug.trim() }))
      .filter((entry) => entry.slug.length > 0)

    setIsSaving(true)
    try {
      const res = await fetchJson<{ localized_slugs: LocalizedSlugEntry[] }>(
        `/admin/products/${data.id}/localized-slugs`,
        { method: "PUT", body: JSON.stringify(payload) }
      )
      setSlugs(res.localized_slugs)
      setIsOpen(false)
      toast.success("Localized slugs updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const sortedSlugs = useMemo(
    () => [...slugs].sort((a, b) => a.locale.localeCompare(b.locale)),
    [slugs]
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Localized Slugs</Heading>
        <Button size="small" variant="secondary" onClick={openDrawer}>
          Edit
        </Button>
      </div>
      <div className="px-6 py-4">
        {sortedSlugs.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No localized slugs set for this product yet.
          </Text>
        ) : (
          <div className="flex flex-col gap-y-2">
            {sortedSlugs.map(({ locale, slug }) => (
              <div key={locale} className="flex items-center gap-x-2">
                <Text size="small" weight="plus" className="w-20 shrink-0">
                  {locale}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {slug}
                </Text>
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Localized Slugs</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4">
            {supportedLocales.length === 0 ? (
              <Text size="small" className="text-ui-fg-subtle">
                No supported locales are configured for the store yet.
              </Text>
            ) : (
              supportedLocales.map((locale) => (
                <div key={locale} className="flex flex-col gap-y-1">
                  <Label size="small">{locale}</Label>
                  <Input
                    value={draft[locale] ?? ""}
                    placeholder="e.g. koszulka-meska"
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        [locale]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))
            )}
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Drawer.Close>
            <Button onClick={handleSave} isLoading={isSaving}>
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default LocalizedSlugsWidget
