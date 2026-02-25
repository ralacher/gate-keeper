<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['confirm', 'cancel'])

const modalEl = ref(null)
const unlatchDate = ref('')

// Default to 1 hour from now, rounded to nearest 5 min
const defaultTime = computed(() => {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0)
  return d.toISOString().slice(0, 16)
})

// Min = now (can't pick a time in the past)
const minTime = computed(() => new Date().toISOString().slice(0, 16))

function open() {
  unlatchDate.value = defaultTime.value
  modalEl.value?.showModal()
}

function handleConfirm() {
  if (unlatchDate.value) {
    emit('confirm', new Date(unlatchDate.value).toISOString())
  }
  modalEl.value?.close()
}

function handleSkip() {
  emit('confirm', null)
  modalEl.value?.close()
}

function handleCancel() {
  emit('cancel')
  modalEl.value?.close()
}

defineExpose({ open })
</script>

<template>
  <dialog ref="modalEl" class="modal modal-bottom sm:modal-middle">
    <div class="modal-box">
      <h3 class="text-lg font-bold">Expected Unlatch Time</h3>
      <p class="py-2 text-sm opacity-70">
        When do you expect to unlatch the gate? This will be shown to your neighbors for awareness.
      </p>

      <div class="form-control mt-2">
        <label class="label">
          <span class="label-text">Expected unlatch at</span>
        </label>
        <input
          v-model="unlatchDate"
          type="datetime-local"
          :min="minTime"
          class="input input-bordered w-full"
        />
      </div>

      <div class="modal-action flex gap-2">
        <button class="btn btn-ghost" @click="handleCancel">Cancel</button>
        <button class="btn btn-outline btn-accent" @click="handleSkip">
          Skip
        </button>
        <button
          class="btn btn-warning"
          :disabled="!unlatchDate"
          @click="handleConfirm"
        >
          Open &amp; Latch
        </button>
      </div>
    </div>

    <!-- Click outside to close -->
    <form method="dialog" class="modal-backdrop">
      <button @click="handleCancel">close</button>
    </form>
  </dialog>
</template>
