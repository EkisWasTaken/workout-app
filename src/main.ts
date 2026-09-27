import { createApp } from 'vue'
import './style.css'
import './styles/app.css'
import './styles/stats.css'
import './components/charts/charts.css'
import App from './App.vue'
import router from './router'
import { hydrateUiLab } from './uiLab'

// Before the app mounts: the saved palette has to be on the document for the
// first paint, or every load flashes the stock colours and corrects itself.
hydrateUiLab()

const app = createApp(App)

app.use(router)

// Auth is initialised in App.vue; per-user settings/fitness hydrate on sign-in.
app.mount('#app')
