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
  <div class="flex flex-col items-center gap-4 w-full">

    <!-- Latch status alert -->
    <div
      class="alert flex flex-row flex-nowrap items-center gap-2 py-2 w-full cursor-pointer transition-opacity hover:opacity-80 active:scale-[0.98]"
      :class="latched ? 'alert-warning' : 'alert-success'"
      title="Tap to correct latch state"
      @click="onAlertClick"
    >
      <svg v-if="latched" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"/>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
      </svg>
      <span class="font-semibold whitespace-nowrap">Current Status:</span>
      <span class="whitespace-nowrap">{{ latched ? 'Latched Open' : 'Unlatched' }}</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0 opacity-40 ml-auto" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
      </svg>
    </div>

    <!-- Confirmation modal -->
    <dialog class="modal" :class="{ 'modal-open': showConfirm }">
      <div class="modal-box">
        <h3 class="text-lg font-bold">Change Latch Status</h3>
        <p class="py-4">
          This will change the status from
          <strong>{{ latched ? 'Latched Open' : 'Unlatched' }}</strong> to
          <strong>{{ latched ? 'Unlatched' : 'Latched Open' }}</strong>.
          This is a manual correction only — it does not physically move the gate.
        </p>
        <p class="text-sm opacity-60">Are you sure?</p>
        <div class="modal-action">
          <button class="btn" @click="cancelToggle">Cancel</button>
          <button class="btn btn-warning" @click="confirmToggle">Yes, Change It</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="cancelToggle">
        <button>close</button>
      </form>
    </dialog>

    <!-- Expected unlatch time (informational) -->
    <div
      v-if="latched && expectedUnlatch"
      class="flex items-center gap-2 rounded-box bg-base-200 px-4 py-2 text-sm"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clip-rule="evenodd"/>
      </svg>
      <span>Expected unlatch at <strong>{{ formatExpectedTime(expectedUnlatch.time) }}</strong> by {{ expectedUnlatch.user || 'unknown' }}</span>
    </div>
  </div>
</template>
