<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useGateDetection } from '../composables/useGateDetection.js'
import { isGateDetectionEnabled } from '../config/featureFlags.js'

const go2rtcUrl = import.meta.env.VITE_GO2RTC_URL || ''
const go2rtcStream = import.meta.env.VITE_GO2RTC_STREAM || ''
const isMock = !go2rtcUrl || !go2rtcStream

// Always proxy through /go2rtc (Vite dev proxy or nginx in production) to avoid CORS
const go2rtcBase = '/go2rtc'

// CSS crop configuration (from env)
const cropScale = parseFloat(import.meta.env.VITE_VIDEO_CROP_SCALE) || 0
const cropOriginX = import.meta.env.VITE_VIDEO_CROP_ORIGIN_X || '0%'
const cropOriginY = import.meta.env.VITE_VIDEO_CROP_ORIGIN_Y || '0%'
const isCropped = cropScale > 1

const cropStyle = computed(() =>
  isCropped
    ? { transform: `scale(${cropScale})`, transformOrigin: `${cropOriginX} ${cropOriginY}` }
    : {},
)

// Point-of-interest rectangle overlay (from env)
const poiLeft = import.meta.env.VITE_VIDEO_POI_LEFT || ''
const poiTop = import.meta.env.VITE_VIDEO_POI_TOP || ''
const poiWidth = import.meta.env.VITE_VIDEO_POI_WIDTH || ''
const poiHeight = import.meta.env.VITE_VIDEO_POI_HEIGHT || ''
const poiLabel = import.meta.env.VITE_VIDEO_POI_LABEL || ''
const poiColor = import.meta.env.VITE_VIDEO_POI_COLOR || 'rgba(239,68,68,0.7)'
const showPoi = !!(poiLeft && poiTop && poiWidth && poiHeight)

const poiStyle = computed(() =>
  showPoi
    ? {
        left: poiLeft,
        top: poiTop,
        width: poiWidth,
        height: poiHeight,
        borderColor: poiColor,
      }
    : {},
)

// ── Gate detection via pixel sampling ─────────────────────────
const gateDetectionEnabled = isGateDetectionEnabled()

// Env-level overrides (fallback to POI center → 50% if neither is set)
const envSampleX = import.meta.env.VITE_GATE_DETECT_SAMPLE_X
const envSampleY = import.meta.env.VITE_GATE_DETECT_SAMPLE_Y

// If the POI rectangle is defined, default the sample point to its centre
// (in raw-video coordinates, reverse-mapped from the cropped viewport).
function poiCenterToRaw(axis) {
  const left = parseFloat(axis === 'x' ? poiLeft : poiTop) || 0
  const size = parseFloat(axis === 'x' ? poiWidth : poiHeight) || 0
  const centerViewport = left + size / 2 // % of cropped viewport

  if (!isCropped) return centerViewport

  const originPct = parseFloat(axis === 'x' ? cropOriginX : cropOriginY) || 0
  const visibleSpan = 100 / cropScale
  return originPct + (centerViewport / 100) * visibleSpan
}

const detectSampleX = envSampleX ? parseFloat(envSampleX) : (showPoi ? poiCenterToRaw('x') : 50)
const detectSampleY = envSampleY ? parseFloat(envSampleY) : (showPoi ? poiCenterToRaw('y') : 50)
const detectSampleSize = parseInt(import.meta.env.VITE_GATE_DETECT_SAMPLE_SIZE, 10) || 20
const detectInterval = parseInt(import.meta.env.VITE_GATE_DETECT_INTERVAL, 10) || 2000
const detectThreshold = parseInt(import.meta.env.VITE_GATE_DETECT_THRESHOLD, 10) || 128
const detectOpenAbove = (import.meta.env.VITE_GATE_DETECT_OPEN_ABOVE ?? 'true') !== 'false'

const emit = defineEmits(['gate-state'])

const videoEl = ref(null)

const {
  detectedState,
  brightness,
  isActive: detectionActive,
  start: startDetection,
  stop: stopDetection,
  sample: sampleOnce,
} = useGateDetection(videoEl, {
  sampleX: detectSampleX,
  sampleY: detectSampleY,
  sampleSize: detectSampleSize,
  interval: detectInterval,
  threshold: detectThreshold,
  openAbove: detectOpenAbove,
  enabled: gateDetectionEnabled,
})

// Emit detected gate state changes to parent
watch(detectedState, (state) => {
  emit('gate-state', state)
})

// Crosshair position in viewport-% coordinates.
// When SAMPLE_X/Y are explicitly set, we use those (converted to viewport coords).
// Otherwise fall back to the POI rectangle centre.
const hasExplicitSample = !!(envSampleX || envSampleY)

function rawToViewport(rawPct, axis) {
  if (!isCropped) return rawPct
  const originPct = parseFloat(axis === 'x' ? cropOriginX : cropOriginY) || 0
  const visibleSpan = 100 / cropScale
  return ((rawPct - originPct) / visibleSpan) * 100
}

const sampleOverlayStyle = computed(() => {
  if (!gateDetectionEnabled) return { display: 'none' }

  if (hasExplicitSample) {
    // Explicit env override — convert raw-video % to viewport %
    return {
      left: `${rawToViewport(detectSampleX, 'x')}%`,
      top: `${rawToViewport(detectSampleY, 'y')}%`,
    }
  }

  if (showPoi) {
    const cx = parseFloat(poiLeft) + parseFloat(poiWidth) / 2
    const cy = parseFloat(poiTop) + parseFloat(poiHeight) / 2
    return { left: `${cx}%`, top: `${cy}%` }
  }

  return {
    left: `${rawToViewport(detectSampleX, 'x')}%`,
    top: `${rawToViewport(detectSampleY, 'y')}%`,
  }
})

// Delay before auto-reconnect after a dropped connection (ms)
const RECONNECT_DELAY_MS = 3000

const status = ref('idle') // idle | connecting | connected | error
const errorMsg = ref('')

let pc = null
let reconnectTimer = null

async function connect() {
  if (isMock || !go2rtcUrl || !go2rtcStream) {
    status.value = 'mock'
    return
  }

  status.value = 'connecting'
  errorMsg.value = ''

  try {
    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    pc.ontrack = (event) => {
      if (videoEl.value) {
        videoEl.value.srcObject = event.streams[0]
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        status.value = 'connected'
        startDetection()
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        stopDetection()
        scheduleReconnect()
      }
    }

    // We need to add a transceiver to receive video
    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // Wait for ICE gathering to complete (or timeout)
    await new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve()
      } else {
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check)
            resolve()
          }
        }
        pc.addEventListener('icegatheringstatechange', check)
        // Timeout fallback
        setTimeout(resolve, 3000)
      }
    })

    // Send offer to go2rtc
    const apiUrl = `${go2rtcBase}/api/webrtc?src=${encodeURIComponent(go2rtcStream)}`
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: pc.localDescription.sdp,
    })

    if (!resp.ok) {
      throw new Error(`go2rtc returned ${resp.status}`)
    }

    const answerSdp = await resp.text()
    await pc.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: answerSdp,
    }))
  } catch (err) {
    console.error('WebRTC connection failed:', err)
    status.value = 'error'
    errorMsg.value = err.message || 'Failed to connect to video stream'
  }
}

/** Schedule an automatic reconnect after a dropped connection. */
function scheduleReconnect() {
  if (reconnectTimer) return // already scheduled
  status.value = 'error'
  errorMsg.value = 'Connection lost, reconnecting…'
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    disconnect()
    connect()
  }, RECONNECT_DELAY_MS)
}

function disconnect() {
  stopDetection()
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (pc) {
    pc.close()
    pc = null
  }
  if (videoEl.value) {
    videoEl.value.srcObject = null
  }
  status.value = 'idle'
}

onMounted(() => {
  connect()
})

onBeforeUnmount(() => {
  disconnect()
})
</script>

<template>
  <div class="glass-card overflow-hidden">
    <!-- Mock / unconfigured placeholder -->
    <div
      v-if="status === 'mock'"
      class="flex aspect-video items-center justify-center bg-base-300/50 text-base-content/30"
    >
      <div class="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto mb-2 h-10 w-10 opacity-30" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2z"/>
        </svg>
        <p class="text-sm font-medium">Camera Feed</p>
        <p class="text-xs text-base-content/20 mt-1">Configure go2rtc to enable</p>
      </div>
    </div>

    <!-- Connecting spinner -->
    <div
      v-else-if="status === 'connecting'"
      class="flex aspect-video items-center justify-center bg-base-300/50"
      aria-busy="true"
      aria-label="Connecting to video stream"
    >
      <span class="loading loading-spinner loading-lg text-primary/50" aria-hidden="true"></span>
    </div>

    <!-- Error / reconnecting state -->
    <div
      v-else-if="status === 'error'"
      class="flex aspect-video flex-col items-center justify-center gap-3 bg-base-300/50"
      role="status"
      :aria-label="errorMsg"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-error/60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      <p class="text-sm text-error/70">{{ errorMsg }}</p>
      <button
        class="rounded-lg border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/20"
        aria-label="Retry video connection"
        @click="connect"
      >
        Retry
      </button>
    </div>

    <!-- Video player (optionally CSS-cropped via VITE_VIDEO_CROP_* env vars) -->
    <div
      v-show="status === 'connected' || status === 'idle'"
      class="relative aspect-video w-full overflow-hidden"
    >
      <video
        ref="videoEl"
        class="aspect-video w-full bg-black"
        :style="cropStyle"
        autoplay
        playsinline
        muted
        aria-label="Gate camera feed"
      />

      <!-- Point-of-interest rectangle overlay -->
      <div
        v-if="showPoi"
        class="pointer-events-none absolute border-2 rounded-sm"
        :style="poiStyle"
        aria-hidden="true"
      >
        <span
          v-if="poiLabel"
          class="absolute bottom-1 right-1 whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-semibold text-white drop-shadow-md"
          :style="{ backgroundColor: poiColor }"
        >{{ poiLabel }}</span>
      </div>

      <!-- Gate detection sample crosshair + brightness readout -->
      <template v-if="gateDetectionEnabled && detectionActive">
        <!-- Crosshair at sample point -->
        <div
          class="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2"
          :style="sampleOverlayStyle"
          aria-hidden="true"
        >
          <!-- Horizontal line (dark outline + bright core) -->
          <div class="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/50"></div>
          <div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white"></div>
          <!-- Vertical line (dark outline + bright core) -->
          <div class="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-black/50"></div>
          <div class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white"></div>
          <!-- Centre dot -->
          <div class="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]"></div>
        </div>

        <!-- Detection badge (top-left of video) -->
        <div
          class="pointer-events-none absolute top-2 left-2 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white drop-shadow-md"
          :class="detectedState === 'open'
            ? 'bg-success/80'
            : detectedState === 'closed'
              ? 'bg-error/80'
              : 'bg-base-content/40'"
          role="status"
          :aria-label="`Gate detected as ${detectedState}`"
        >
          <span
            class="inline-block h-1.5 w-1.5 rounded-full"
            :class="detectedState === 'open'
              ? 'bg-green-300'
              : detectedState === 'closed'
                ? 'bg-red-300'
                : 'bg-gray-300'"
          ></span>
          {{ detectedState === 'open' ? 'Open' : detectedState === 'closed' ? 'Closed' : '…' }}
          <span class="ml-0.5 font-normal opacity-70">B:{{ brightness }}</span>
        </div>
      </template>
    </div>
  </div>
</template>
