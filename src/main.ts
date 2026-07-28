import { createApp } from 'vue'
import './style.css'
import './styles/app.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

// Auth is initialised in App.vue; per-user settings/fitness hydrate on sign-in.
app.mount('#app')
