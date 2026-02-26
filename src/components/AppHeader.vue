<script setup>
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme.js'

defineProps({
  userEmail: { type: String, default: '' },
  notificationsEnabled: { type: Boolean, default: false },
})

defineEmits(['toggle-notifications'])

const { mode, cycleTheme } = useTheme()

const themeLabel = computed(() => {
  if (mode.value === 'dark') return 'Dark mode — click for light mode'
  if (mode.value === 'light') return 'Light mode — click for system mode'
  return 'System mode — click for dark mode'
})
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-base-content/[0.06] bg-base-100/80 backdrop-blur-lg">
    <div class="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-5">
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <img src="/gate-icon.svg" alt="Gate" class="h-5 w-5" />
        </div>
        <span class="text-base font-semibold tracking-tight text-base-content">Gate Control</span>
      </div>
      <div class="flex items-center gap-2">
        <!-- User email badge — truncated with native tooltip for overflow -->
        <span
          class="max-w-[120px] truncate rounded-full bg-base-200 px-2.5 py-1 text-[11px] font-medium text-base-content/50"
          :title="userEmail"
        >{{ userEmail }}</span>

        <!-- Theme cycle button (system / dark / light) -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg text-base-content/30 transition-colors hover:text-base-content/70"
          :title="themeLabel"
          :aria-label="themeLabel"
          @click="cycleTheme"
        >
          <!-- System (auto) icon -->
          <svg v-if="mode === 'system'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clip-rule="evenodd"/>
          </svg>
          <!-- Dark (moon) icon -->
          <svg v-else-if="mode === 'dark'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
          </svg>
          <!-- Light (sun) icon -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- Notification toggle button -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          :class="notificationsEnabled ? 'bg-primary/10 text-primary' : 'text-base-content/30 hover:text-base-content/50'"
          :aria-label="notificationsEnabled ? 'Disable push notifications' : 'Enable push notifications'"
          :aria-pressed="notificationsEnabled"
          :title="notificationsEnabled ? 'Disable push notifications' : 'Enable push notifications'"
          @click="$emit('toggle-notifications')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
