import { onBeforeUnmount, onMounted, watch } from "vue"
import { useRoute } from "vue-router"

type RefreshHandler = () => Promise<void> | void
type ErrorHandler = (error: unknown) => void

export function useAutoRefresh(refresh: RefreshHandler, onError: ErrorHandler) {
  const route = useRoute()
  let refreshToken = 0
  let inFlightRefresh: Promise<void> | null = null
  let needsRefresh = false

  async function runRefresh() {
    if (inFlightRefresh) {
      needsRefresh = true
      return inFlightRefresh
    }

    const currentToken = ++refreshToken
    needsRefresh = false

    inFlightRefresh = Promise.resolve()
      .then(refresh)
      .catch((error) => {
        if (currentToken === refreshToken) {
          onError(error)
        }
      })
      .finally(() => {
        inFlightRefresh = null
        if (needsRefresh) {
          void runRefresh()
        }
      })

    return inFlightRefresh
  }

  function refreshWhenVisible() {
    if (document.visibilityState === "visible") {
      void runRefresh()
    }
  }

  function handlePageShow(event: PageTransitionEvent) {
    if (event.persisted) {
      void runRefresh()
    }
  }

  function handleVisibilityChange() {
    refreshWhenVisible()
  }

  function handleFocus() {
    refreshWhenVisible()
  }

  function handleOnline() {
    refreshWhenVisible()
  }

  onMounted(() => {
    void runRefresh()
    window.addEventListener("pageshow", handlePageShow)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("online", handleOnline)
  })

  onBeforeUnmount(() => {
    refreshToken += 1
    window.removeEventListener("pageshow", handlePageShow)
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    window.removeEventListener("focus", handleFocus)
    window.removeEventListener("online", handleOnline)
  })

  watch(
    () => route.fullPath,
    () => {
      if (document.visibilityState === "visible") {
        void runRefresh()
      }
    },
  )

  return runRefresh
}
