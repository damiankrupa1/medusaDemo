import { useCallback, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

const NAMESPACE = "payload-embed"
const VERSION = 1

type Theme = {
  backgroundColor: string
  colorScheme: "dark" | "light"
}

type Message =
  | { type: "hello"; payload: { lng: "en" | "pl"; theme: Theme } }
  | { type: "locale:changed"; payload: { lng: "en" | "pl" } }
  | { type: "theme:changed"; payload: Theme }
  | { type: "session:logout"; payload: Record<string, never> }

const getLocale = (language: string): "en" | "pl" =>
  language.toLowerCase().startsWith("pl") ? "pl" : "en"

const isTransparent = (color: string) =>
  color === "transparent" || color === "rgba(0, 0, 0, 0)"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const getHostTheme = (iframe: HTMLIFrameElement): Theme => {
  let backgroundColor = ""
  let element = iframe.parentElement

  while (element && element !== document.body) {
    const color = window.getComputedStyle(element).backgroundColor
    if (!isTransparent(color)) {
      backgroundColor = color
      break
    }
    element = element.parentElement
  }

  if (!backgroundColor) {
    const bodyColor = window.getComputedStyle(document.body).backgroundColor
    const rootColor = window.getComputedStyle(document.documentElement).backgroundColor
    backgroundColor = !isTransparent(bodyColor)
      ? bodyColor
      : !isTransparent(rootColor)
        ? rootColor
        : "rgb(255, 255, 255)"
  }

  const channels = backgroundColor.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i
  )
  const luminance = channels
    ? channels
        .slice(1, 4)
        .map((channel) => Number(channel) / 255)
        .map((channel) =>
          channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
        )
        .reduce(
          (sum, channel, index) =>
            sum + channel * [0.2126, 0.7152, 0.0722][index],
          0
        )
    : 1

  return {
    backgroundColor,
    colorScheme: luminance > 0.5 ? "light" : "dark",
  }
}

export const usePayloadEmbedBridge = (url?: string) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastTheme = useRef<string>()
  const { i18n } = useTranslation()
  const targetOrigin = url ? new URL(url).origin : undefined

  const send = useCallback(
    (message: Message) => {
      const frame = iframeRef.current?.contentWindow
      if (!frame || !targetOrigin) return

      frame.postMessage(
        { ns: NAMESPACE, v: VERSION, ...message },
        targetOrigin
      )
    },
    [targetOrigin]
  )

  const sendHello = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const theme = getHostTheme(iframe)
    lastTheme.current = JSON.stringify(theme)
    send({
      type: "hello",
      payload: {
        lng: getLocale(i18n.language),
        theme,
      },
    })
  }, [i18n.language, send])

  const onLoad = useCallback(() => sendHello(), [sendHello])

  useEffect(() => {
    if (!url) return

    const notifyLocale = (language: string) => {
      send({ type: "locale:changed", payload: { lng: getLocale(language) } })
    }
    const observer = new MutationObserver(() => {
      const iframe = iframeRef.current
      if (!iframe) return

      const theme = getHostTheme(iframe)
      const serialized = JSON.stringify(theme)
      if (serialized === lastTheme.current) return

      lastTheme.current = serialized
      send({ type: "theme:changed", payload: theme })
    })
    const onFrameMessage = (event: MessageEvent) => {
      if (
        event.origin !== targetOrigin ||
        event.source !== iframeRef.current?.contentWindow ||
        !isRecord(event.data) ||
        event.data.ns !== NAMESPACE ||
        event.data.v !== VERSION ||
        event.data.type !== "ready"
      ) {
        return
      }

      sendHello()
    }

    i18n.on("languageChanged", notifyLocale)
    window.addEventListener("message", onFrameMessage)
    const observedElements = new Set<Element>([
      document.documentElement,
      document.body,
    ])
    let parent = iframeRef.current?.parentElement
    while (parent && parent !== document.body) {
      observedElements.add(parent)
      parent = parent.parentElement
    }

    for (const element of observedElements) {
      observer.observe(element, {
        attributes: true,
        attributeFilter: ["class", "data-theme", "style"],
      })
    }

    const onPageHide = () =>
      send({ type: "session:logout", payload: {} })
    window.addEventListener("pagehide", onPageHide)

    return () => {
      i18n.off("languageChanged", notifyLocale)
      window.removeEventListener("message", onFrameMessage)
      observer.disconnect()
      window.removeEventListener("pagehide", onPageHide)
    }
  }, [i18n, send, url])

  return { iframeRef, onLoad }
}
