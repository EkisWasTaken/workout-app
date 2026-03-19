// src/theme.ts
import { ref, computed, watchEffect } from 'vue'
import { darkTheme, GlobalThemeOverrides } from 'naive-ui'

export const themes = ['dark', 'light', 'dark-blue', 'light-solarized', 'dark-solarized']
export const theme = ref('dark')

export const primaryColor = ref('#00b33c')
export const bodyColor = ref('#040604')
export const cardColor = ref('rgba(6, 8, 6, 0.85)')

export const naiveTheme = computed(() => (theme.value.includes('dark') ? darkTheme : null))

export const themeOverrides = computed<GlobalThemeOverrides>(() => {
  return {
    common: {
      primaryColor: primaryColor.value,
      primaryColorHover: primaryColor.value,
      bodyColor: bodyColor.value,
      cardColor: cardColor.value,
      borderRadius: '4px'
    },
    Layout: {
      color: bodyColor.value,
      siderColor: cardColor.value
    },
    Card: {
      color: cardColor.value
    },
    Menu: {
      color: cardColor.value
    }
  }
})

export const setTheme = (newTheme: string) => {
  theme.value = newTheme
  document.documentElement.setAttribute('data-theme', newTheme)
  // a little delay to allow the css variables to be updated
  setTimeout(() => {
    const style = getComputedStyle(document.documentElement)
    const getVar = (name: string) => style.getPropertyValue(name).trim()
    
    primaryColor.value = getVar('--primary-color') || getVar('--accent-color') || '#00b33c'
    bodyColor.value = getVar('--background-color') || '#040604'
    cardColor.value = getVar('--card-background-color') || 'rgba(6, 8, 6, 0.85)'
    
    console.log('Theme updated:', { primary: primaryColor.value, body: bodyColor.value, card: cardColor.value })
  }, 150)
}

watchEffect(() => {
  setTheme(theme.value)
})

export const changePrimaryColor = (color: string) => {
  primaryColor.value = color
}
