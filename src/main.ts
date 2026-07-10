import { createApp } from 'vue'
import './style.css'
import './styles/app.css'
import App from './App.vue'
import router from './router'
import { hydrateSettings } from './settings'

const app = createApp(App)

app.use(router)

// Mount immediately off the localStorage cache; the DB refresh lands after.
app.mount('#app')

hydrateSettings()
