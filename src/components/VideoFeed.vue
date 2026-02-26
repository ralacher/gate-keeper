<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

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

// Delay before auto-reconnect after a dropped connection (ms)
const RECONNECT_DELAY_MS = 3000

const videoEl = ref(null)
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
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
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
      class="aspect-video w-full overflow-hidden"
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
    </div>
  </div>
</template>
