<script setup>
defineProps({
  history: {
    type: Array,
    required: true,
  },
})

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <h2 class="mb-3 text-lg font-semibold tracking-wide opacity-80">Activity History</h2>

    <div v-if="history.length === 0" class="rounded-box bg-base-200 p-6 text-center opacity-60">
      No activity yet — use the controls above to get started.
    </div>

    <div v-else class="overflow-x-auto rounded-box">
      <table class="table table-zebra table-sm w-full">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>User</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in history" :key="entry.id">
            <td class="whitespace-nowrap">{{ formatDate(entry.timestamp) }}</td>
            <td class="whitespace-nowrap">{{ formatTime(entry.timestamp) }}</td>
            <td class="max-w-[140px] truncate">{{ entry.user }}</td>
            <td>
              <span
                class="badge badge-sm"
                :class="{
                  'badge-primary': entry.action === 'Opened gate',
                  'badge-warning': entry.action === 'Opened & latched gate',
                  'badge-accent': entry.action === 'Unlatched gate',
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
</template>
