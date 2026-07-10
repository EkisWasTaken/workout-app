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
				<router-link to="/profile" class="navigation-link" title="Profile">
					<span class="icon"><n-icon :component="PersonCircleOutline" /></span>
					<span v-if="!collapsed" class="label">Profile</span>
				</router-link>
				<button @click="toggleCollapse" class="navigation-link collapse-button"
					:title="collapsed ? 'Expand' : 'Collapse'" :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
					<span class="icon"><n-icon :component="collapsed ? ChevronForwardOutline : ChevronBackOutline" /></span>
					<span v-if="!collapsed" class="label">Collapse</span>
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
			<!-- Home shows a full race hero of its own; this bar would repeat it. -->
			<RaceCountdown v-if="$route.name !== 'Home'" />
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
	/* dvh tracks the shrinking mobile URL bar; vh above is the fallback. */
	height: 100dvh;
	width: 100vw;
	position: relative;
	background-color: var(--background-color);
	overflow: hidden;
}

.sidebar {
	width: var(--sidebar-width);
	background: linear-gradient(180deg, var(--sidebar-bg-top) 0%, var(--sidebar-bg-bottom) 100%);
	border-right: 1px solid var(--border-color);
	display: flex;
	flex-direction: column;
	transition: width 0.22s ease;
	padding: 12px 10px;
	z-index: var(--z-chrome);
	flex-shrink: 0;
}

.sidebar.collapsed {
	width: var(--sidebar-collapsed-width);
}

.sidebar-header {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 6px 6px 14px;
	margin-bottom: 8px;
	border-bottom: 1px solid var(--border-color);
}
/* Collapsed: centre the mark in the same box the icons occupy. */
.sidebar.collapsed .sidebar-header { justify-content: center; padding-left: 0; padding-right: 0; }

.brand-mark {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	border-radius: var(--radius-sm);
	background: linear-gradient(135deg, rgba(79,140,255,0.22) 0%, rgba(79,140,255,0.10) 100%);
	border: 1px solid rgba(79,140,255,0.25);
	color: var(--primary-color);
	font-size: 1.05rem;
	flex-shrink: 0;
	box-shadow: 0 0 12px rgba(79,140,255,0.15);
}

.brand-name {
	font-size: 0.95rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--text-color);
	white-space: nowrap;
	overflow: hidden;
}

.navigation { flex: 1; min-height: 0; }
.navigation ul {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.navigation-link {
	position: relative;
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	padding: 9px 10px;
	color: var(--text-secondary);
	text-decoration: none;
	border-radius: var(--radius-sm);
	white-space: nowrap;
	overflow: hidden;
	transition: background-color 0.15s ease, color 0.15s ease;
	font-size: 0.88rem;
	font-weight: 500;
	font-family: inherit;
	/* Pin the row height to the icon box so <a> and <button> rows match exactly. */
	line-height: 1.2;
	min-height: calc(var(--nav-icon-size) + 18px);
	background: transparent;
	border: none;
	cursor: pointer;
	text-align: left;
	box-sizing: border-box;
}

.sidebar.collapsed .navigation-link { justify-content: center; gap: 0; padding-left: 0; padding-right: 0; }

.navigation-link:hover {
	background-color: var(--surface-hover);
	color: var(--text-color);
}

.navigation-link.router-link-active {
	background-color: rgba(79, 140, 255, 0.10);
	color: var(--primary-color);
}

/* Active indicator as an overlay, so it never reflows the icon or label.
   A border + padding swap shifted the icon by 2px, worst in the collapsed rail. */
.navigation-link.router-link-active::before {
	content: '';
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	height: 60%;
	width: 2px;
	border-radius: 0 2px 2px 0;
	background: var(--primary-color);
}

/* A fixed square keeps every label on the same x, whatever the glyph's width. */
.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--nav-icon-size);
	height: var(--nav-icon-size);
	font-size: var(--nav-icon-size);
	flex-shrink: 0;
}

.label { overflow: hidden; text-overflow: ellipsis; }

.sidebar-footer {
	margin-top: auto;
	padding-top: 10px;
	border-top: 1px solid var(--border-color);
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.collapse-button { color: var(--text-muted); }

.main-content {
	flex: 1;
	min-width: 0;
	overflow-y: auto;
	/* No z-index here: it would create a stacking context and trap modals
	   beneath the bottom nav. */
	position: relative;
	width: 100%;
}

/* Mobile bottom nav */
.mobile-nav {
	display: none;
	position: fixed;
	bottom: 0;
	left: 0;
	width: 100%;
	/* The bar is nav-height tall; the inset is extra room under it, not a squeeze. */
	height: var(--mobile-nav-total);
	padding-bottom: env(safe-area-inset-bottom, 0px);
	background-color: var(--surface-color);
	border-top: 1px solid var(--border-color);
	z-index: var(--z-chrome);
}
.mobile-nav ul {
	display: flex;
	justify-content: space-around;
	align-items: center;
	height: var(--mobile-nav-height);
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
.mobile-nav a .icon { width: auto; height: auto; font-size: 1.3rem; }
.mobile-nav a.active { color: var(--primary-color); }

@media (max-width: 768px) {
	.sidebar { display: none !important; }
	.mobile-nav { display: block !important; }
	.layout { flex-direction: column; }
	/* No height override: .main-content is `flex: 1` in a column flex container,
	   so flex sizing wins and any `height` here is silently ignored. Reserve the
	   nav's space with padding on the scroll container instead. */
	.main-content {
		padding-bottom: calc(var(--mobile-nav-total) + 12px);
		scroll-padding-bottom: var(--mobile-nav-total);
	}
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.16s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
