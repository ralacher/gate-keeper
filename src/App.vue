<script setup>
import { ref } from 'vue'
import { useGate } from './composables/useGate.js'
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
  userEmail,
  expectedUnlatch,
  handleOpen,
  handleOpenAndLatch,
  handleUnlatch,
  clearExpectedUnlatch,
  toggleLatchState,
} = useGate()

function onOpenAndLatchClick() {
  schedulerModal.value?.open()
}

function onScheduleConfirm(unlatchAt) {
  handleOpenAndLatch(unlatchAt)
}
</script>

<template>
  <div class="min-h-screen bg-base-100" data-theme="dark">
    <!-- Header -->
    <header class="navbar bg-base-200 shadow-lg">
      <div class="mx-auto flex w-full max-w-xl items-center justify-between px-4">
        <div class="flex items-center gap-2">
          <img src="/gate-icon.svg" alt="Gate" class="h-8 w-8" />
          <span class="text-lg font-bold tracking-tight">Gate Control</span>
        </div>
        <span class="text-xs opacity-50">{{ userEmail }}</span>
      </div>
    </header>

    <!-- Main content -->
    <main class="mx-auto max-w-xl px-4 py-6">
      <!-- Error toast -->
      <div v-if="error" class="alert alert-error mb-4 shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Video feed -->
      <section class="mb-6">
        <VideoFeed />
      </section>

      <!-- Help & Instructions -->
      <section class="mb-6">
        <div class="collapse collapse-arrow bg-base-200 rounded-box">
          <input type="checkbox" />
          <div class="collapse-title font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 opacity-60" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
            </svg>
            How to Use This App
          </div>
          <div class="collapse-content space-y-4 text-sm leading-relaxed">

            <div class="flex gap-3">
              <span class="text-xl">🔓</span>
              <div>
                <p class="font-semibold">Open</p>
                <p class="opacity-70">Opens the gate for a vehicle to pass through. The gate will close automatically after a short delay.</p>
              </div>
            </div>

            <div class="flex gap-3">
              <span class="text-xl">🔒</span>
              <div>
                <p class="font-semibold">Latch</p>
                <p class="opacity-70">Opens the gate <em>and</em> holds it open so it won't close on its own. Useful when you're expecting deliveries or guests. You'll be asked for an expected unlatch time so your neighbors know when the gate will be secured again.</p>
              </div>
            </div>

            <div class="flex gap-3">
              <span class="text-xl">✅</span>
              <div>
                <p class="font-semibold">Unlatch</p>
                <p class="opacity-70">Releases the latch so the gate can close and stay closed. Use this when you no longer need the gate held open.</p>
              </div>
            </div>

            <div class="divider my-1"></div>

            <div class="flex gap-3">
              <span class="text-xl">🟡</span>
              <div>
                <p class="font-semibold">Status Bar</p>
                <p class="opacity-70">The colored bar above the buttons shows whether the gate is currently latched open or not. Tap it to manually correct the status if it seems wrong — there is no physical sensor on the latch.</p>
              </div>
            </div>

            <div class="flex gap-3">
              <span class="text-xl">📋</span>
              <div>
                <p class="font-semibold">Activity History</p>
                <p class="opacity-70">Shows a log of who opened, latched, or unlatched the gate and when. This is shared between all neighbors so everyone can stay informed.</p>
              </div>
            </div>

            <div class="flex gap-3">
              <span class="text-xl">⚠️</span>
              <div>
                <p class="font-semibold">Safety Note</p>
                <p class="opacity-70">This app has no way to detect if something is blocking the gate. Always check the camera feed before pressing any button.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- Latch status -->
      <section class="mb-6 flex justify-center">
        <LatchStatus
          :latched="latched"
          :expected-unlatch="expectedUnlatch"
          @clear-expected="clearExpectedUnlatch"
          @toggle-latch="toggleLatchState"
        />
      </section>

      <!-- Gate controls -->
      <section class="mb-8">
        <GateControls
          :active-action="activeAction"
          :latched="latched"
          :countdown="countdown"
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
      <div class="divider"></div>

      <!-- History -->
      <section class="pb-8">
        <ActivityHistory :history="history" />
      </section>
    </main>
  </div>
</template>
