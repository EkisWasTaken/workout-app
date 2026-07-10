<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button @click="close" class="close-button">&times;</button>
      </div>
      <div class="modal-body">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: 'Details',
  },
});

const emit = defineEmits(['update:show']);

function close() {
  emit('update:show', false);
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(5, 8, 12, 0.6);
  backdrop-filter: blur(3px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-modal);
  padding: 16px;
  /* Clear the bottom nav's home-indicator inset on phones. */
  padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}

.modal-content {
  width: 100%;
  max-width: 520px;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  color: var(--text-color);
  font-family: var(--font-family);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-button {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  transition: color 0.15s;
}

.close-button:hover {
  color: var(--text-color);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex-grow: 1;
}

</style>
