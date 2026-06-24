<template>
	<div class="layout" :class="{ 'is-mobile': isMobile }">
		<!-- Desktop Sidebar -->
		<aside class="sidebar" :class="{ 'collapsed': collapsed }">
			<div class="sidebar-header">
				<span class="brand-mark"><n-icon :component="PulseOutline" /></span>
				<span v-if="!collapsed" class="brand-name">Trainlog</span>
			</div>

			<nav class="navigation">
				<ul>
					<li v-for="item in menuOptions" :key="item.key">
						<router-link :to="item.to" class="navigation-link" :title="item.label">
							<span class="icon"><n-icon :component="item.icon" /></span>
							<span v-if="!collapsed" class="label">{{ item.label }}</span>
						</router-link>
					</li>
				</ul>
			</nav>

			<div class="sidebar-footer">
				<router-link to="/profile" class="profile-link" title="Profile">
					<n-icon :component="PersonCircleOutline" />
					<span v-if="!collapsed">Profile</span>
				</router-link>
				<button @click="toggleCollapse" class="collapse-button" :title="collapsed ? 'Expand' : 'Collapse'">
					<n-icon :component="collapsed ? ChevronForwardOutline : ChevronBackOutline" />
				</button>
			</div>
		</aside>

		<!-- Mobile Bottom Navigation -->
		<nav class="mobile-nav">
			<ul>
				<li v-for="item in menuOptions" :key="item.key">
					<router-link :to="item.to" :class="{ active: $route.name === item.key }">
						<span class="icon"><n-icon :component="item.icon" /></span>
						<span class="mobile-label">{{ item.label }}</span>
					</router-link>
				</li>
				<li>
					<router-link to="/profile" :class="{ active: $route.name === 'Profile' }">
						<span class="icon"><n-icon :component="PersonCircleOutline" /></span>
						<span class="mobile-label">Profile</span>
					</router-link>
				</li>
			</ul>
		</nav>

		<main class="main-content">
			<RaceCountdown />
			<router-view v-slot="{ Component }">
				<transition name="fade" mode="out-in">
					<component :is="Component" />
				</transition>
			</router-view>
		</main>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, markRaw } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import RaceCountdown from '@/components/RaceCountdown.vue'
import { NIcon } from 'naive-ui'
import {
	GridOutline,
	CalendarOutline,
	CopyOutline,
	BarbellOutline,
	PersonCircleOutline,
	PulseOutline,
	ChevronBackOutline,
	ChevronForwardOutline
} from '@vicons/ionicons5'

const menuOptions = [
	{ label: 'Home', key: 'Home', to: { name: 'Home' }, icon: markRaw(GridOutline) },
	{ label: 'Schedule', key: 'Schedule', to: { name: 'Schedule' }, icon: markRaw(CalendarOutline) },
	{ label: 'Templates', key: 'Templates', to: { name: 'Templates' }, icon: markRaw(CopyOutline) },
	{ label: 'Exercises', key: 'Exercises', to: { name: 'Exercises' }, icon: markRaw(BarbellOutline) },
]

const collapsed = ref(false)
const isMobile = ref(window.innerWidth <= 768)

function toggleCollapse() {
	collapsed.value = !collapsed.value
}

const handleResize = () => {
	isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
	window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
	window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.layout {
	display: flex;
	height: 100vh;
	width: 100vw;
	position: relative;
	background-color: var(--background-color);
	overflow: hidden;
}

.sidebar {
	width: var(--sidebar-width);
	background: linear-gradient(180deg, #141e2e 0%, #101620 100%);
	border-right: 1px solid var(--border-color);
	display: flex;
	flex-direction: column;
	transition: width 0.22s ease;
	padding: 14px 12px;
	z-index: 1000;
	flex-shrink: 0;
}

.sidebar.collapsed {
	width: var(--sidebar-collapsed-width);
}

.sidebar-header {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 8px 18px;
	margin-bottom: 10px;
	border-bottom: 1px solid var(--border-color);
}

.brand-mark {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: var(--radius-sm);
	background: linear-gradient(135deg, rgba(79,140,255,0.22) 0%, rgba(79,140,255,0.10) 100%);
	border: 1px solid rgba(79,140,255,0.25);
	color: var(--primary-color);
	font-size: 1.2rem;
	flex-shrink: 0;
	box-shadow: 0 0 12px rgba(79,140,255,0.15);
}

.brand-name {
	font-size: 1.05rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--text-color);
}

.navigation { flex: 1; }
.navigation ul {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.navigation-link {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 11px 12px;
	color: var(--text-secondary);
	text-decoration: none;
	border-radius: var(--radius-sm);
	white-space: nowrap;
	overflow: hidden;
	transition: background-color 0.15s ease, color 0.15s ease;
	font-size: 0.92rem;
	font-weight: 500;
}

.sidebar.collapsed .navigation-link { justify-content: center; }

.navigation-link:hover {
	background-color: var(--surface-hover);
	color: var(--text-color);
}

.navigation-link.router-link-active {
	background-color: rgba(79, 140, 255, 0.10);
	color: var(--primary-color);
	border-left: 2px solid var(--primary-color);
	padding-left: 10px;
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.35rem;
	flex-shrink: 0;
}

.sidebar-footer {
	margin-top: auto;
	padding-top: 12px;
	border-top: 1px solid var(--border-color);
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.profile-link {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 10px 12px;
	border-radius: var(--radius-sm);
	color: var(--text-secondary);
	text-decoration: none;
	font-size: 0.92rem;
	font-weight: 500;
	transition: background-color 0.15s, color 0.15s;
}
.profile-link:hover { background-color: var(--surface-hover); color: var(--text-color); }
.profile-link .n-icon { font-size: 1.35rem; }

.collapse-button {
	background: transparent;
	border: none;
	color: var(--text-muted);
	padding: 8px;
	cursor: pointer;
	border-radius: var(--radius-sm);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.2rem;
	transition: background-color 0.15s, color 0.15s;
}
.sidebar:not(.collapsed) .collapse-button { align-self: flex-end; }
.collapse-button:hover { background-color: var(--surface-hover); color: var(--text-color); }

.main-content {
	flex: 1;
	overflow-y: auto;
	position: relative;
	z-index: 1;
	width: 100%;
}

/* Mobile bottom nav */
.mobile-nav {
	display: none;
	position: fixed;
	bottom: 0;
	left: 0;
	width: 100%;
	height: var(--mobile-nav-height);
	background-color: var(--surface-color);
	border-top: 1px solid var(--border-color);
	z-index: 1000;
	padding-bottom: env(safe-area-inset-bottom);
}
.mobile-nav ul {
	display: flex;
	justify-content: space-around;
	align-items: center;
	height: 100%;
	padding: 0;
	margin: 0;
	list-style: none;
}
.mobile-nav li { flex: 1; }
.mobile-nav a {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: var(--text-muted);
	text-decoration: none;
	font-size: 0.62rem;
	font-weight: 500;
	gap: 3px;
	height: 100%;
}
.mobile-nav a .icon { font-size: 1.3rem; }
.mobile-nav a.active { color: var(--primary-color); }

@media (max-width: 768px) {
	.sidebar { display: none !important; }
	.mobile-nav { display: block !important; }
	.layout { flex-direction: column; }
	.main-content {
		padding-bottom: calc(var(--mobile-nav-height) + 8px);
		height: calc(100vh - var(--mobile-nav-height));
	}
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.16s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
