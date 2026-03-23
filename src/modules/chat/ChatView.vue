<template>
  <dialog
    ref="dialogRef"
    class="modal modal-bottom sm:modal-end"
    @close="handleDialogClose"
  >
    <div class="modal-box" :class="boxClass">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-4">
          <img
            class="rounded-full h-16 w-16"
            src="../../assets/images/pito-avatar.png"
          />
          <h2 class="text-lg font-bold">Pito</h2>
        </div>
        <button class="btn btn-sm" @click="closeModal">
          <X />
        </button>
      </div>
      <div class="border-b-1 text-primary/20 mb-4"></div>
      <slot name="content" />
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { X } from "@lucide/vue";
import { ref } from "vue";
defineProps({
  title: {
    type: String,
    required: true,
  },
  boxClass: {
    type: String,
  },
});

const dialogRef = ref<HTMLDialogElement | null>(null);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "open"): void;
}>();

function openModal() {
  dialogRef.value?.showModal();
  emit("open");
}

function closeModal() {
  dialogRef.value?.close();
}

function handleDialogClose() {
  emit("close");
}

defineExpose({
  openModal,
  closeModal,
});
</script>
