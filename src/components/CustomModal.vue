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

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: 'Terminal',
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
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  width: 95%;
  max-width: 600px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
  color: var(--text-color);
  font-family: var(--font-family);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

@media (min-width: 769px) {
  .modal-content {
    width: 50%;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid var(--border-color);
  background-color: #000;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 1.1em;
  color: var(--accent-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-button {
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 1.5em;
  cursor: pointer;
  padding: 0 5px;
}

.close-button:hover {
  color: var(--link-hover-color);
}

.modal-body {
  padding: 20px 15px;
  overflow-y: auto;
  flex-grow: 1;
}

</style>
