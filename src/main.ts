import { createApp } from 'vue'
import './style.css'
import './styles/app.css'
import './styles/stats.css'
import './components/charts/charts.css'
import App from './App.vue'
import router from './router'
import { hydrateTheme } from './theme'

// Before the app mounts: the chosen theme has to be on the document for the
// first paint, or every load flashes the other ground and corrects itself.
hydrateTheme()

const app = createApp(App)

app.use(router)

// Auth is initialised in App.vue; per-user settings/fitness hydrate on sign-in.
app.mount('#app')

// Opens offline once visited. Production over http(s) only: dev would serve stale modules.
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
	navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Offline support unavailable', err))
}
