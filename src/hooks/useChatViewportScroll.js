import { useLayoutEffect } from 'react'

// Preserve the bottom anchor as the keyboard or a growing composer resizes the list.
export default function useChatViewportScroll(listRef, roomId) {
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return undefined
    let height = list.clientHeight
    let followLatest = list.scrollHeight - list.scrollTop - height < 96
    const onScroll = () => {
      // A viewport resize can emit scroll before ResizeObserver runs.
      if (list.clientHeight !== height) return
      followLatest = list.scrollHeight - list.scrollTop - height < 96
    }
    const observer = new ResizeObserver(() => {
      const nextHeight = list.clientHeight
      if (nextHeight === height) return
      height = nextHeight
      if (followLatest) list.scrollTop = list.scrollHeight
    })
    list.addEventListener('scroll', onScroll, { passive: true })
    observer.observe(list)
    return () => {
      observer.disconnect()
      list.removeEventListener('scroll', onScroll)
    }
  }, [listRef, roomId])
}
