<script setup lang="ts">
import { onMounted } from 'vue'
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, NLoadingBarProvider } from 'naive-ui'
import MainLayout from './layouts/MainLayout.vue'
import AuthGate from './components/AuthGate.vue'
import { naiveTheme, themeOverrides } from './theme'
import { auth, initAuth, onUserChange } from './auth'
import { hydrateSettings, resetSettingsCache } from './settings'
import { refreshFitness } from './fitness'
import { resetStats } from './stats'
import { resetPhotos } from './photos'
import type { User } from '@supabase/supabase-js'

/** Wipe the previous user's cached settings/stats/fitness, then load the new user's. */
function applyUser(user: User | null) {
	resetSettingsCache()
	resetStats()
	resetPhotos()
	if (user) {
		hydrateSettings()
		refreshFitness()
	}
}

onMounted(async () => {
	await initAuth()
	onUserChange(applyUser)
	// initAuth doesn't emit for a session that's already restored at boot.
	if (auth.user) applyUser(auth.user)
})
</script>

<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides" class="full-height">
    <n-loading-bar-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <n-message-provider>
            <AuthGate v-if="auth.ready && !auth.user" />
            <MainLayout v-else-if="auth.ready && auth.user" />
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
