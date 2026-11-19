import { beforeEach, expect, vi } from 'vitest'
import { FakeResizeObserver } from './resizeObserverTestUtils'

expect.addEqualityTesters([
  (a, b) =>
    a instanceof Temporal.PlainYearMonth && b instanceof Temporal.PlainYearMonth
      ? a.equals(b)
      : undefined,
])

HTMLDialogElement.prototype.show = function mock(this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.showModal = function mock(this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close = function mock(this: HTMLDialogElement) {
  if (!this.open) {
    return
  }
  this.open = false
  this.dispatchEvent(new Event('close'))
}

HTMLElement.prototype.hidePopover = function mock(this: HTMLElement) {
  this.style.display = 'none'
}
HTMLElement.prototype.showPopover = function mock(this: HTMLElement) {
  this.style.removeProperty('display')
}

const originalMatches = Element.prototype.matches
Element.prototype.matches = function mock(
  this: HTMLElement,
  selector: string,
): boolean {
  if (selector === ':popover-open') {
    return this.style.display !== 'none'
  }
  return originalMatches.call(this, selector)
} as typeof Element.prototype.matches

// Popovers start hidden, as they do in a browser.
const popoverDefaultApplied = new WeakSet<Element>()
const originalSetAttribute = Element.prototype.setAttribute
Element.prototype.setAttribute = function mock(
  this: HTMLElement,
  name: string,
  value: string,
) {
  originalSetAttribute.call(this, name, value)
  if (name === 'popover' && !popoverDefaultApplied.has(this)) {
    popoverDefaultApplied.add(this)
    this.style.display = 'none'
  }
} as typeof Element.prototype.setAttribute

document.addEventListener('click', (event) => {
  const trigger = (event.target as Element | null)?.closest?.('[popovertarget]')
  if (!trigger) {
    return
  }

  const targetId = trigger.getAttribute('popovertarget')
  const target = targetId && document.getElementById(targetId)
  if (!target) {
    return
  }

  const action = trigger.getAttribute('popovertargetaction') ?? 'toggle'
  const isOpen = target.matches(':popover-open')
  if (action === 'show' || (action === 'toggle' && !isOpen)) {
    target.showPopover()
  } else if (action === 'hide' || (action === 'toggle' && isOpen)) {
    target.hidePopover()
  }
})

HTMLCanvasElement.prototype.getContext = function mock() {
  return null
} as typeof HTMLCanvasElement.prototype.getContext

Element.prototype.scrollIntoView = function mock() {}

globalThis.ResizeObserver = FakeResizeObserver
beforeEach(() => {
  FakeResizeObserver.instances = []
})

// jsdom does no layout, so give elements a plausible on-screen rect for code
// that measures position, such as popover placement.
Element.prototype.getBoundingClientRect = function mock(this: Element) {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 100,
    bottom: 40,
    width: 100,
    height: 40,
    toJSON() {
      return this
    },
  }
}

// Testing Library only advances fake timers when it finds a `jest` global,
// and otherwise waits on a faked setTimeout that never fires.
Object.assign(globalThis, {
  jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) },
})
