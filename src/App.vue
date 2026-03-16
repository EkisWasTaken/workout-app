<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, NLoadingBarProvider } from 'naive-ui'
import MainLayout from './layouts/MainLayout.vue'
import { naiveTheme, themeOverrides } from './theme'
</script>

<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides" class="full-height">
    <n-loading-bar-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <n-message-provider>
            <MainLayout />
          </n-message-provider>
        </n-dialog-provider>
      </n-notification-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<style>
/* Resetting default margin and padding */
body {
  margin: 0;
  padding: 0;
  background-color: var(--background-color);
  width: 100vw;
  height: 100vh;
}

#app {
  width: 100%;
  height: 100%;
}

.full-height {
  height: 100%;
  width: 100%;
}
</style>
