<script setup>
import { ref } from 'vue'

const props = defineProps({
  latched: Boolean,
  expectedUnlatch: Object, // { time: ISO, user: string } or null
})

const emit = defineEmits(['toggle-latch'])

const showConfirm = ref(false)

function onAlertClick() {
  showConfirm.value = true
}

function confirmToggle() {
  showConfirm.value = false
  emit('toggle-latch')
}

function cancelToggle() {
  showConfirm.value = false
}

function formatExpectedTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col items-center gap-3 w-full">

    <!-- Latch status alert -->
    <div
      class="glass-card flex w-full cursor-pointer items-center gap-3 px-4 py-3 transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
      :class="latched
        ? 'border-warning/20 bg-warning/[0.06]'
        : 'border-accent/20 bg-accent/[0.06]'"
      title="Tap to correct latch state"
      @click="onAlertClick"
    >
      <!-- Status dot -->
      <div
        class="h-2.5 w-2.5 shrink-0 rounded-full"
        :class="latched ? 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-accent shadow-[0_0_8px_rgba(16,185,129,0.5)]'"
      ></div>

      <div class="flex items-center gap-2 min-w-0">
        <span class="text-sm font-semibold whitespace-nowrap" :class="latched ? 'text-warning' : 'text-accent'">
          {{ latched ? 'Latched Open' : 'Secured' }}
        </span>
        <span class="text-xs text-base-content/40 whitespace-nowrap">
          {{ latched ? 'Gate is held open' : 'Gate will close normally' }}
        </span>
      </div>

      <svg xmlns="http://www.w3.org/2000/svg" class="ml-auto h-3.5 w-3.5 shrink-0 text-base-content/20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
      </svg>
    </div>

    <!-- Confirmation modal -->
    <dialog class="modal" :class="{ 'modal-open': showConfirm }">
      <div class="modal-box border border-white/[0.06] bg-base-200">
        <h3 class="text-lg font-bold">Change Latch Status</h3>
        <p class="py-4 text-base-content/70">
          This will change the status from
          <strong class="text-base-content">{{ latched ? 'Latched Open' : 'Secured' }}</strong> to
          <strong class="text-base-content">{{ latched ? 'Secured' : 'Latched Open' }}</strong>.
          This is a manual correction only — it does not physically move the gate.
        </p>
        <p class="text-sm text-base-content/40">Are you sure?</p>
        <div class="modal-action">
          <button class="btn btn-ghost btn-sm" @click="cancelToggle">Cancel</button>
          <button class="btn btn-warning btn-sm" @click="confirmToggle">Yes, Change It</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop bg-black/60 backdrop-blur-sm" @click="cancelToggle">
        <button>close</button>
      </form>
    </dialog>

    <!-- Expected unlatch time (informational) -->
    <div
      v-if="latched && expectedUnlatch"
      class="glass-card flex w-full items-center gap-2.5 px-4 py-2.5 text-sm"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-base-content/40" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clip-rule="evenodd"/>
      </svg>
      <span class="text-base-content/60">Expected unlatch at <strong class="text-base-content/80">{{ formatExpectedTime(expectedUnlatch.time) }}</strong> by {{ expectedUnlatch.user || 'unknown' }}</span>
    </div>
  </div>
</template>
