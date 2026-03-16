<template>
  <component :is="tag" :class="['typewriter-header', { 'finished': finished }]">
    <span class="text">{{ displayedText }}</span>
    <span class="terminal-cursor" v-if="!finished || showCursorAfter"></span>
  </component>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{
  text: string
  tag?: string
  speed?: number
  delay?: number
  showCursorAfter?: boolean
}>()

const tag = props.tag || 'h1'
const speed = props.speed || 50
const delay = props.delay || 0
const displayedText = ref('')
const finished = ref(false)

const startTyping = () => {
  displayedText.value = ''
  finished.value = false
  
  setTimeout(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < props.text.length) {
        displayedText.value += props.text.charAt(i)
        i++
      } else {
        clearInterval(interval)
        finished.value = true
      }
    }, speed)
  }, delay)
}

onMounted(() => {
  startTyping()
})

watch(() => props.text, () => {
  startTyping()
})
</script>

<style scoped>
.typewriter-header {
  display: inline-block;
  margin: 0;
  white-space: pre-wrap;
}

.text {
  position: relative;
}
</style>
