<template>
  <n-modal v-model:show="showModal" preset="card" title="Log Daily Weight" style="width: 400px;">
    <n-form @submit.prevent="handleSave">
      <n-form-item-row label="Date">
        <n-date-picker v-model:formatted-value="date" type="date" style="width: 100%;" />
      </n-form-item-row>
      <n-form-item-row label="Weight (kg)">
        <n-input-number v-model:value="weight" :min="0" :step="0.1" style="width: 100%;" />
      </n-form-item-row>
      <n-button type="primary" attr-type="submit">Save</n-button>
    </n-form>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NModal, NForm, NFormItemRow, NDatePicker, NInputNumber, NButton } from 'naive-ui';
import { format } from 'date-fns';

const props = defineProps<{
  show: boolean;
  initialDate?: string;
}>();

const emit = defineEmits(['update:show', 'save']);

const showModal = ref(props.show);
const date = ref<string | null>(props.initialDate || format(new Date(), 'yyyy-MM-dd'));
const weight = ref<number | null>(null);

watch(() => props.show, (newVal) => {
  showModal.value = newVal;
  if (newVal) {
    date.value = props.initialDate || format(new Date(), 'yyyy-MM-dd');
    weight.value = null;
  }
});

watch(showModal, (newVal) => {
  emit('update:show', newVal);
});

const handleSave = () => {
  if (date.value && weight.value) {
    emit('save', { date: date.value, weight: weight.value });
    showModal.value = false;
  }
};
</script>
