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
      <section>
        <ActivityHistory :history="history" />
      </section>
    </main>
  </div>
</template>
