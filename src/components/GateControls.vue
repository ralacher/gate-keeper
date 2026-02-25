<script setup>
defineProps({
  activeAction: String,
  latched: Boolean,
  countdown: { type: Number, default: 0 },
})

defineEmits(['open', 'open-and-latch', 'unlatch'])
</script>

<template>
  <div class="grid grid-cols-3 gap-3">
    <!-- Open -->
    <button
      class="btn btn-primary btn-lg gap-2 h-16"
      :disabled="activeAction || latched"
      @click="$emit('open')"
    >
      <span v-if="activeAction === 'open' && countdown === 0" class="loading loading-spinner loading-sm"></span>
      <span v-else-if="activeAction === 'open' && countdown > 0" class="countdown font-mono text-lg"><span :style="`--value:${countdown}`"></span></span>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 111.414 1.414L5.414 15H7a1 1 0 110 2H3a1 1 0 01-1-1v-4zm13.707 4.707a1 1 0 010-1.414L15.414 13H14a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0v-1.586l-2.293 2.293a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
      </svg>
      <span>{{ activeAction === 'open' ? (countdown > 0 ? 'Gate open' : 'Opening…') : 'Open' }}</span>
    </button>

    <!-- Open & Latch -->
    <button
      class="btn btn-warning btn-lg gap-2 h-16"
      :disabled="activeAction || latched"
      @click="$emit('open-and-latch')"
    >
      <span v-if="activeAction === 'open-and-latch' && countdown === 0" class="loading loading-spinner loading-sm"></span>
      <span v-else-if="activeAction === 'open-and-latch' && countdown > 0" class="countdown font-mono text-lg"><span :style="`--value:${countdown}`"></span></span>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"/>
      </svg>
      <span>{{ activeAction === 'open-and-latch' ? (countdown > 0 ? 'Gate open' : 'Opening…') : 'Latch' }}</span>
    </button>

    <!-- Unlatch -->
    <button
      class="btn btn-accent btn-lg gap-2 h-16"
      :disabled="activeAction || !latched"
      @click="$emit('unlatch')"
    >
      <span v-if="activeAction === 'unlatch'" class="loading loading-spinner loading-sm"></span>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
      </svg>
      <span>{{ activeAction === 'unlatch' ? 'Unlatching…' : 'Unlatch' }}</span>
    </button>
  </div>
</template>
