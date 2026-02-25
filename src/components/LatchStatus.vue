<script setup>
defineProps({
  latched: Boolean,
  expectedUnlatch: Object, // { time: ISO, user: string } or null
})

defineEmits(['toggle-latch'])

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
  <div class="flex flex-col items-center gap-2">
    <div class="flex items-center gap-3">
      <button
        class="badge gap-2 px-4 py-3 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 active:scale-95"
        :class="latched ? 'badge-warning' : 'badge-success'"
        title="Tap to correct latch state"
        @click="$emit('toggle-latch')"
      >
        <span
          class="inline-block h-2.5 w-2.5 rounded-full"
          :class="latched ? 'bg-warning-content' : 'bg-success-content'"
        />
        {{ latched ? 'Latched Open' : 'Unlatched' }}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 opacity-50" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
        </svg>
      </button>
    </div>

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
