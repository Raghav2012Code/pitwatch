import { useSyncExternalStore } from 'react'

const subscribe = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}

export const useIsFullscreen = () =>
  useSyncExternalStore(subscribe, () => !!document.fullscreenElement)

export const fullscreenSupported = () =>
  typeof document !== 'undefined' && document.fullscreenEnabled

/** Errors (e.g. the browser refusing) leave the page as it was, so they are ignored. */
export const toggleFullscreen = () => {
  const p = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen()
  p.catch(() => {})
}
