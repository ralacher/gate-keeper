<script setup>
import { ref, computed } from 'vue'
import { useGate } from './composables/useGate.js'
import { useTheme } from './composables/useTheme.js'
import AppHeader from './components/AppHeader.vue'
import VideoFeed from './components/VideoFeed.vue'
import LatchStatus from './components/LatchStatus.vue'
import GateControls from './components/GateControls.vue'
import UnlatchScheduler from './components/UnlatchScheduler.vue'
import ActivityHistory from './components/ActivityHistory.vue'

const schedulerModal = ref(null)

const {
  latched,
  activeAction,
  countdown,
  error,
  history,
  isLoading,
  userEmail,
  expectedUnlatch,
  notificationsEnabled,
  featureFlags,
  handleOpen,
  handleOpenAndLatch,
  handleUnlatch,
  clearExpectedUnlatch,
  toggleLatchState,
  toggleNotifications,
} = useGate()

const { resolvedTheme } = useTheme()

const manualLatchUiEnabled = computed(
  () => featureFlags.latchEnabled,
)

function onOpenAndLatchClick() {
  if (!featureFlags.latchEnabled) return
  schedulerModal.value?.open()
}

function onScheduleConfirm(unlatchAt) {
  handleOpenAndLatch(unlatchAt)
}
</script>

<template>
  <div class="min-h-screen bg-base-100" :data-theme="resolvedTheme">
    <!-- Gradient background accent -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div class="absolute -top-48 left-1/2 h-96 w-[600px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl"></div>
    </div>

    <!-- Header -->
    <AppHeader
      :user-email="userEmail"
      :notifications-enabled="notificationsEnabled"
      @toggle-notifications="toggleNotifications"
    />

    <!-- Main content -->
    <main class="relative mx-auto max-w-xl px-5 py-6 space-y-5">
      <!-- Error toast -->
      <div
        v-if="error"
        role="alert"
        aria-live="assertive"
        class="glass-card flex items-center gap-3 border-error/20 bg-error/10 px-4 py-3"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-error" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span class="text-sm text-error">{{ error }}</span>
      </div>

      <!-- Initial load skeleton -->
      <div v-if="isLoading" class="glass-card flex items-center justify-center py-10" aria-busy="true" aria-label="Loading gate status">
        <span class="loading loading-spinner loading-md text-primary/50"></span>
      </div>

      <template v-else>
        <!-- Video feed -->
        <section>
          <VideoFeed />
        </section>

        <!-- Help & Instructions -->
        <section>
          <div class="glass-card overflow-hidden">
            <details class="group">
              <summary class="flex cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium text-base-content/70 transition-colors hover:text-base-content">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-50" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                </svg>
                How to Use This App
                <svg xmlns="http://www.w3.org/2000/svg" class="ml-auto h-4 w-4 opacity-30 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </summary>
              <div class="border-t border-base-content/[0.04] px-4 py-4 space-y-3.5 text-sm leading-relaxed">

                <div class="flex gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base" aria-hidden="true">🔓</span>
                  <div>
                    <p class="font-medium text-base-content">Open</p>
                    <p class="text-base-content/50">Opens the gate for a vehicle to pass through. The gate will close automatically after a short delay.</p>
                  </div>
                </div>

                <div v-if="manualLatchUiEnabled" class="flex gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-base" aria-hidden="true">🔒</span>
                  <div>
                    <p class="font-medium text-base-content">Latch</p>
                    <p class="text-base-content/50">Opens the gate <em>and</em> holds it open. Useful when expecting deliveries or guests. You'll set an expected unlatch time for your neighbors.</p>
                  </div>
                </div>

                <div v-if="manualLatchUiEnabled" class="flex gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-base" aria-hidden="true">✅</span>
                  <div>
                    <p class="font-medium text-base-content">Unlatch</p>
                    <p class="text-base-content/50">Releases the latch so the gate can close and stay closed.</p>
                  </div>
                </div>

                <div class="my-2 border-t border-base-content/[0.04]"></div>

                <div v-if="manualLatchUiEnabled" class="flex gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-base-300 text-base" aria-hidden="true">🟡</span>
                  <div>
                    <p class="font-medium text-base-content">Status Bar</p>
                    <p class="text-base-content/50">Shows whether the gate is latched open or not. Tap it to manually correct the status if needed.</p>
                  </div>
                </div>

                <div class="flex gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-base-300 text-base" aria-hidden="true">📋</span>
                  <div>
                    <p class="font-medium text-base-content">Activity History</p>
                    <p class="text-base-content/50">A shared log of who opened, latched, or unlatched the gate and when.</p>
                  </div>
                </div>

                <div class="flex gap-3 rounded-lg bg-error/5 px-3 py-2.5">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-error/10 text-base" aria-hidden="true">⚠️</span>
                  <div>
                    <p class="font-medium text-error/80">Safety Note</p>
                    <p class="text-base-content/50">Always check the camera feed before pressing any button.</p>
                  </div>
                </div>

              </div>
            </details>
          </div>
        </section>

        <!-- Latch status -->
        <section class="flex justify-center">
          <LatchStatus
            :latched="latched"
            :expected-unlatch="expectedUnlatch"
            :manual-toggle-enabled="manualLatchUiEnabled"
            @clear-expected="clearExpectedUnlatch"
            @toggle-latch="toggleLatchState"
          />
        </section>

        <!-- Gate controls -->
        <section>
          <GateControls
            :active-action="activeAction"
            :latched="latched"
            :countdown="countdown"
            :latch-enabled="featureFlags.latchEnabled"
            @open="handleOpen"
            @open-and-latch="onOpenAndLatchClick"
            @unlatch="handleUnlatch"
          />
        </section>

        <!-- Unlatch scheduler modal -->
        <UnlatchScheduler
          ref="schedulerModal"
          @confirm="onScheduleConfirm"
        />

        <!-- Divider -->
        <div class="flex items-center gap-3 pt-2" aria-hidden="true">
          <div class="h-px flex-1 bg-gradient-to-r from-transparent via-base-content/[0.08] to-transparent"></div>
        </div>

        <!-- History -->
        <section class="pb-8">
          <ActivityHistory :history="history" />
        </section>
      </template>
    </main>
  </div>
</template>
