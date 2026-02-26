<script setup>
defineProps({
  userEmail: { type: String, default: '' },
  notificationsEnabled: { type: Boolean, default: false },
})

defineEmits(['toggle-notifications'])
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-white/[0.06] bg-base-100/80 backdrop-blur-lg">
    <div class="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-5">
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <img src="/gate-icon.svg" alt="Gate" class="h-5 w-5" />
        </div>
        <span class="text-base font-semibold tracking-tight text-base-content">Gate Control</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="rounded-full bg-base-200 px-2.5 py-1 text-[11px] font-medium text-base-content/50">{{ userEmail }}</span>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          :class="notificationsEnabled ? 'bg-primary/10 text-primary' : 'text-base-content/30 hover:text-base-content/50'"
          title="Toggle notifications"
          @click="$emit('toggle-notifications')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
