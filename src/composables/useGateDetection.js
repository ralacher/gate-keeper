import { ref, watch, onBeforeUnmount, getCurrentInstance } from 'vue'

/**
 * Composable that periodically samples a region of a <video> element,
 * computes average brightness, and infers a binary gate state
 * (open vs closed) by comparing brightness to a configurable threshold.
 *
 * @param {import('vue').Ref<HTMLVideoElement|null>} videoEl - ref to the video element
 * @param {object} options
 * @param {number}  options.sampleX      – horizontal center as % of video width (0-100)
 * @param {number}  options.sampleY      – vertical center as % of video height (0-100)
 * @param {number}  options.sampleSize   – side length in px of the square sample area
 * @param {number}  options.interval     – milliseconds between samples
 * @param {number}  options.threshold    – brightness value (0-255) that divides open/closed
 * @param {boolean} options.openAbove    – when true brightness >= threshold → "open"
 * @param {boolean} options.enabled      – master switch; detection only runs when true
 */
export function useGateDetection(videoEl, options = {}) {
  const {
    sampleX = 50,
    sampleY = 50,
    sampleSize = 20,
    interval = 2000,
    threshold = 128,
    openAbove = true,
    enabled = false,
  } = options

  /** @type {import('vue').Ref<'open'|'closed'|'unknown'>} */
  const detectedState = ref('unknown')
  /** Average brightness of the last sample (0-255) */
  const brightness = ref(0)
  /** Whether detection is actively polling */
  const isActive = ref(false)

  let timer = null
  let canvas = null
  let ctx = null

  function ensureCanvas() {
    if (!canvas) {
      canvas = document.createElement('canvas')
      ctx = canvas.getContext('2d', { willReadFrequently: true })
    }
  }

  /**
   * Sample a small region of the video, compute average luminance,
   * and update detectedState.
   */
  function sample() {
    const video = videoEl?.value
    if (!video || video.readyState < 2) {
      detectedState.value = 'unknown'
      return
    }

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) {
      detectedState.value = 'unknown'
      return
    }

    ensureCanvas()

    // Centre of the sample area in actual video pixels
    const cx = Math.round((sampleX / 100) * vw)
    const cy = Math.round((sampleY / 100) * vh)
    const half = Math.floor(sampleSize / 2)

    // Clamp to video bounds
    const sx = Math.max(0, cx - half)
    const sy = Math.max(0, cy - half)
    const sw = Math.min(sampleSize, vw - sx)
    const sh = Math.min(sampleSize, vh - sy)

    if (sw <= 0 || sh <= 0) {
      detectedState.value = 'unknown'
      return
    }

    canvas.width = sw
    canvas.height = sh

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)

    const imageData = ctx.getImageData(0, 0, sw, sh)
    const data = imageData.data
    const pixelCount = data.length / 4

    // Weighted luminance (BT.601)
    let total = 0
    for (let i = 0; i < data.length; i += 4) {
      total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    }

    const avg = pixelCount > 0 ? total / pixelCount : 0
    brightness.value = Math.round(avg)

    if (openAbove) {
      detectedState.value = avg >= threshold ? 'open' : 'closed'
    } else {
      detectedState.value = avg < threshold ? 'open' : 'closed'
    }
  }

  function start() {
    if (!enabled || isActive.value) return
    isActive.value = true
    sample()
    timer = setInterval(sample, interval)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    isActive.value = false
    detectedState.value = 'unknown'
    brightness.value = 0
  }

  // Only register lifecycle hook when called inside a component setup
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      stop()
    })
  }

  return {
    detectedState,
    brightness,
    isActive,
    start,
    stop,
    sample,
  }
}
