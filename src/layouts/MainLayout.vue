<template>
	<div class="layout" :class="{ 'is-mobile': isMobile }">
		<!-- Desktop Sidebar -->
		<aside class="sidebar" :class="{ collapsed }">
			<div class="sidebar-header">
				<router-link to="/" class="brand" title="Trainlog · Home">
					<BrandLogo :size="30" />
					<span class="brand-name">Train<span class="brand-accent">log</span></span>
				</router-link>
			</div>

			<!-- Sits on the sidebar's edge so it never takes a row of its own. -->
			<button class="collapse-handle" @click="toggleCollapse"
				:title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
				:aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'" :aria-expanded="!collapsed">
				<n-icon :component="collapsed ? ChevronForwardOutline : ChevronBackOutline" />
			</button>

			<nav class="navigation" aria-label="Main">
				<ul>
					<li v-for="item in menuOptions" :key="item.key">
						<router-link :to="item.to" class="navigation-link" :title="collapsed ? item.label : undefined">
							<span class="icon"><n-icon :component="item.icon" /></span>
							<span class="label">{{ item.label }}</span>
						</router-link>
					</li>
				</ul>
			</nav>

			<div class="sidebar-footer">
				<button @click="toggleTheme" class="navigation-link"
					:title="collapsed ? (isDark ? 'Light mode' : 'Dark mode') : undefined"
					:aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'">
					<span class="icon"><n-icon :component="isDark ? SunnyOutline : MoonOutline" /></span>
					<span class="label">{{ isDark ? 'Light mode' : 'Dark mode' }}</span>
				</button>
				<!-- Who is signed in, one click from their profile. -->
				<router-link to="/profile" class="account" :title="collapsed ? 'Profile' : undefined">
					<span class="avatar">{{ initials }}</span>
					<span class="account-text">
						<span class="account-name">{{ displayName }}</span>
						<span class="account-sub">{{ auth.user?.email || 'Profile & settings' }}</span>
					</span>
				</router-link>
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

		<main ref="mainEl" class="main-content">
			<!-- Home shows a full race hero of its own; this bar would repeat it. -->
			<RaceCountdown v-if="$route.name !== 'Home'" />
			<router-view v-slot="{ Component }">
				<!-- The page scrolls inside <main>, not the window, so the router's own
				     scroll handling never reaches it: every page used to open wherever
				     the last one had been scrolled to. -->
				<transition name="fade" mode="out-in" @before-enter="resetScroll">
					<component :is="Component" />
				</transition>
			</router-view>
		</main>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, markRaw } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import RaceCountdown from '@/components/RaceCountdown.vue'
import BrandLogo from '@/components/BrandLogo.vue'
import { auth } from '@/auth'
import { settings } from '@/settings'
import { NIcon } from 'naive-ui'
import {
	GridOutline,
	CalendarOutline,
	CopyOutline,
	FlagOutline,
	PersonCircleOutline,
	ChevronBackOutline,
	ChevronForwardOutline,
	MoonOutline,
	SunnyOutline
} from '@vicons/ionicons5'
import { isDark, toggleTheme } from '@/theme'

const menuOptions = [
	{ label: 'Home', key: 'Home', to: { name: 'Home' }, icon: markRaw(GridOutline) },
	{ label: 'Schedule', key: 'Schedule', to: { name: 'Schedule' }, icon: markRaw(CalendarOutline) },
	{ label: 'Goals', key: 'Goals', to: { name: 'Goals' }, icon: markRaw(FlagOutline) },
	{ label: 'Templates', key: 'Templates', to: { name: 'Templates' }, icon: markRaw(CopyOutline) },
]

// Remembered per browser: it is a layout preference, not account data.
const COLLAPSE_KEY = 'sidebarCollapsed'
function readCollapsed() {
	try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
}
const collapsed = ref(readCollapsed())
watch(collapsed, v => {
	try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0') } catch { /* storage blocked */ }
})

/** The name from Profile, else the part of the email before the @. */
const displayName = computed(() =>
	settings.userName?.trim() || auth.user?.email?.split('@')[0] || 'Profile')
const initials = computed(() => {
	const parts = displayName.value.split(/[\s._-]+/).filter(Boolean)
	return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
})

const mainEl = ref<HTMLElement | null>(null)
/** Start each page at the top. Profile's own `?focus=` scroll runs after this. */
function resetScroll() {
	mainEl.value?.scrollTo({ top: 0 })
}
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

/*
 * Sidebar. Icons sit at a fixed x in both states — only the width changes and
 * the labels fade — so collapsing never makes the rail jump sideways.
 * Geometry: 12px sidebar padding + 12px link padding puts every 20px icon's
 * centre 34px from the left edge, which is also the centre of the 68px rail.
 */
.sidebar {
	position: relative;
	width: var(--sidebar-width);
	background: linear-gradient(180deg, var(--sidebar-bg-top), var(--sidebar-bg-bottom));
	border-right: 1px solid var(--border-color);
	display: flex;
	flex-direction: column;
	transition: width 0.22s ease;
	padding: 14px 12px 12px;
	z-index: var(--z-chrome);
	flex-shrink: 0;
}
.sidebar.collapsed { width: var(--sidebar-collapsed-width); }

.sidebar-header { padding-bottom: 14px; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); }

.brand {
	display: flex;
	align-items: center;
	gap: 11px;
	/* 7px + half the 30px logo = 22px from the padding edge: the icon column. */
	padding: 4px 7px;
	border-radius: var(--radius-sm);
	text-decoration: none;
	overflow: hidden;
}
.brand:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
.brand-name {
	font-family: var(--font-display);
	font-size: 1.12rem;
	font-weight: 700;
	letter-spacing: -0.02em;
	color: var(--text-color);
	white-space: nowrap;
	transition: opacity 0.15s;
}
.brand-accent { color: var(--primary-color); }

/* Collapse handle on the sidebar's right edge. Shown while the sidebar is
   hovered or focused into; always on touch, where there is no hover. */
.collapse-handle {
	position: absolute;
	top: 22px;
	right: -12px;
	width: 24px;
	height: 24px;
	border-radius: 50%;
	border: 1px solid var(--border-color);
	background: var(--surface-elevated);
	color: var(--text-secondary);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.8rem;
	cursor: pointer;
	opacity: 0;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
	transition: opacity 0.15s, color 0.15s, border-color 0.15s;
}
.sidebar:hover .collapse-handle,
.sidebar:focus-within .collapse-handle { opacity: 1; }
.collapse-handle:hover { color: var(--primary-color); border-color: var(--primary-color); }
.collapse-handle:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
@media (hover: none) { .collapse-handle { opacity: 1; } }

.navigation { flex: 1; min-height: 0; }
.navigation ul {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.navigation-link {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	height: 40px;
	padding: 0 12px;
	color: var(--text-secondary);
	text-decoration: none;
	border-radius: var(--radius-sm);
	white-space: nowrap;
	overflow: hidden;
	transition: background-color 0.15s ease, color 0.15s ease;
	font-size: 0.9rem;
	font-weight: 500;
	font-family: inherit;
	background: transparent;
	border: none;
	cursor: pointer;
	text-align: left;
	box-sizing: border-box;
}
.navigation-link:hover { background-color: var(--surface-hover); color: var(--text-color); }
.navigation-link:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }
.navigation-link.router-link-active { background-color: var(--primary-soft); color: var(--text-color); font-weight: 600; }
.navigation-link.router-link-active .icon { color: var(--primary-color); }

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

.label, .account-text { overflow: hidden; text-overflow: ellipsis; transition: opacity 0.15s; }
.sidebar.collapsed .label,
.sidebar.collapsed .brand-name,
.sidebar.collapsed .account-text { opacity: 0; pointer-events: none; }

.sidebar-footer {
	margin-top: auto;
	padding-top: 10px;
	border-top: 1px solid var(--border-color);
	display: flex;
	flex-direction: column;
	gap: 3px;
}
.sidebar-footer .navigation-link { color: var(--text-muted); }
.sidebar-footer .navigation-link:hover { color: var(--text-color); }

.account {
	display: flex;
	align-items: center;
	gap: 10px;
	/* 7px + half the 30px avatar = 22px from the padding edge: the icon column. */
	padding: 6px 5px 6px 7px;
	border-radius: var(--radius-sm);
	text-decoration: none;
	overflow: hidden;
	transition: background-color 0.15s;
}
.account:hover { background: var(--surface-hover); }
.account:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }
.account.router-link-active { background: var(--primary-soft); }
.avatar {
	width: 30px;
	height: 30px;
	border-radius: 50%;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--primary-soft);
	color: var(--primary-color);
	box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 35%, transparent);
	font-family: var(--font-display);
	font-size: 0.74rem;
	font-weight: 700;
	letter-spacing: 0.02em;
}
.account-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.account-name, .account-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-name { font-size: 0.86rem; font-weight: 600; color: var(--text-color); }
.account-sub { font-size: 0.72rem; color: var(--text-muted); }

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
