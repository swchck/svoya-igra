/** A box in viewport pixels. */
export interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** CSS selector of a tour target. */
export function targetSelector(id: string): string {
  return `[data-tour="${id}"]`
}

function visible(el: Element): boolean {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

/** Finds the first rendered element matching the selector. */
export function findVisible(selector: string): Element | null {
  for (const el of document.querySelectorAll(selector)) if (visible(el)) return el
  return null
}

/** Resolves with the element once it is rendered, or null after the timeout. */
export function waitFor(selector: string, timeoutMs: number): Promise<Element | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    const check = () => {
      const el = findVisible(selector)
      if (el || Date.now() - started >= timeoutMs) {
        clearInterval(timer)
        resolve(el)
      }
    }
    const timer = setInterval(check, 50)
    check()
  })
}

/** Resolves true once nothing rendered matches the selector, false after the timeout. */
export async function waitGone(selector: string, timeoutMs: number): Promise<boolean> {
  const started = Date.now()
  while (findVisible(selector)) {
    if (Date.now() - started >= timeoutMs) return false
    await new Promise((r) => setTimeout(r, 50))
  }
  return true
}

/** The smallest box containing every given element. */
export function unionBox(els: Element[]): Box | null {
  if (!els.length) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const el of els) {
    const r = el.getBoundingClientRect()
    left = Math.min(left, r.left)
    top = Math.min(top, r.top)
    right = Math.max(right, r.right)
    bottom = Math.max(bottom, r.bottom)
  }
  return { left, top, width: right - left, height: bottom - top }
}
