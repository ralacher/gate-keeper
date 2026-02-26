<script setup>
defineProps({
  history: {
    type: Array,
    required: true,
  },
})

function formatDateTime(iso) {
  const d = new Date(iso)
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return { date, time }
}
</script>

<template>
  <div>
    <h2 class="section-label mb-4">Activity History</h2>

    <div v-if="history.length === 0" class="glass-card flex flex-col items-center justify-center px-6 py-10 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="mb-3 h-8 w-8 text-base-content/20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clip-rule="evenodd"/>
      </svg>
      <p class="text-sm text-base-content/40">No activity yet</p>
      <p class="text-xs text-base-content/25 mt-1">Use the controls above to get started</p>
    </div>

    <div v-else class="glass-card overflow-hidden">
      <div class="overflow-x-auto overscroll-x-contain" style="-webkit-overflow-scrolling: touch">
      <table class="w-full text-sm" aria-label="Gate activity history">
        <thead>
          <tr class="border-b border-base-content/[0.06] text-left">
            <th class="px-4 py-3 text-xs font-medium uppercase tracking-wider text-base-content/30" scope="col">When</th>
            <th class="px-4 py-3 text-xs font-medium uppercase tracking-wider text-base-content/30" scope="col">User</th>
            <th class="px-4 py-3 text-xs font-medium uppercase tracking-wider text-base-content/30" scope="col">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-base-content/[0.04]">
          <tr v-for="entry in history" :key="entry.id" class="transition-colors hover:bg-base-content/[0.02]">
            <td class="whitespace-nowrap px-4 py-3 text-base-content/50">
              <div>{{ formatDateTime(entry.timestamp).date }}</div>
              <div class="text-xs text-base-content/30">{{ formatDateTime(entry.timestamp).time }}</div>
            </td>
            <td class="max-w-[140px] truncate px-4 py-3 text-base-content/70">{{ entry.user }}</td>
            <td class="px-4 py-3">
              <span
                class="text-sm font-medium"
                :class="{
                  'text-primary': entry.action === 'Opened gate',
                  'text-warning': entry.action?.startsWith('Opened & latched'),
                  'text-accent': entry.action === 'Unlatched gate',
                  'text-info': entry.action?.startsWith('Manual correction'),
                }"
              >
                {{ entry.action }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>
