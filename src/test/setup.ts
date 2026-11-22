import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement <dialog>'s showModal() and close(). This stand-in only toggles
// the `open` attribute and fires "close" like a browser does. It has no backdrop,
// focus trapping or Esc handling, so tests can't check those.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.open) {
      return
    }
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
