<template>
	<div class="layout" :class="{ 'is-mobile': isMobile }">
		<!-- CRT Overlays -->
		<div class="crt-overlay"></div>
		<div class="crt-scanline-sweep"></div>
		<div class="crt-flicker"></div>
		
		<!-- Desktop Sidebar -->
		<aside class="sidebar glitch-alive" :class="{ 'collapsed': collapsed }">
			<div class="sidebar-header">
				<span v-if="!collapsed" class="glitch-text">[TERMINAL-FITNESS]</span>
				<span v-else>[T-F]</span>
				<div class="power-indicator"></div>
			</div>
			<nav class="navigation">
				<ul>
					<li v-for="item in menuOptions" :key="item.key">
						<router-link :to="item.to">
							<span class="prompt">></span>
							<span class="icon">{{ item.icon }}</span>
							<span v-if="!collapsed" class="label">{{ item.label }}</span>
							<span class="terminal-cursor" v-if="$route.name === item.key"></span>
						</router-link>
					</li>
				</ul>
			</nav>
			<div class="sidebar-footer">
				<button @click="toggleCollapse" class="collapse-button">
					<span v-if="!collapsed">_COLLAPSE_SYS</span>
					<span v-else>>></span>
				</button>
				<router-link to="/profile" class="profile-link">
					<span v-if="!collapsed">_USER_PROFILE</span>
					<span v-else>[P]</span>
				</router-link>
			</div>
		</aside>

		<!-- Mobile Bottom Navigation -->
		<nav class="mobile-nav">
			<ul>
				<li v-for="item in menuOptions" :key="item.key">
					<router-link :to="item.to">
						<span class="icon">{{ item.icon }}</span>
						<span class="mobile-label">{{ item.label.slice(0, 4) }}</span>
						<div class="active-indicator" v-if="$route.name === item.key"></div>
					</router-link>
				</li>
				<li>
					<router-link to="/profile">
						<span class="icon">[P]</span>
						<span class="mobile-label">USER</span>
						<div class="active-indicator" v-if="$route.name === 'Profile'"></div>
					</router-link>
				</li>
			</ul>
		</nav>

		<main class="main-content">
			<RaceCountdown />
			<router-view v-slot="{ Component }">
				<transition name="fade-scan" mode="out-in">
					<component :is="Component" />
				</transition>
			</router-view>
		</main>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { db } from '@/db'
import RaceCountdown from '@/components/RaceCountdown.vue'

const menuOptions = [
	{
		label: 'FEED',
		key: 'Landing',
		to: { name: 'Landing' },
		icon: '[F]'
	},
	{
		label: 'OVERVIEW',
		key: 'Overview',
		to: { name: 'Overview' },
		icon: '[O]'
	},
	{
		label: 'DASHBOARD',
		key: 'Dashboard',
		to: { name: 'Dashboard' },
		icon: '[D]'
	},
	{
		label: 'TEMPLATES',
		key: 'Templates',
		to: { name: 'Templates' },
		icon: '[T]'
	},
	{
		label: 'EXERCISES',
		key: 'Exercises',
		to: { name: 'Exercises' },
		icon: '[E]'
	}
]

const collapsed = ref(true)
const isMobile = ref(window.innerWidth <= 768)

function toggleCollapse() {
	collapsed.value = !collapsed.value
}

const handleResize = () => {
	isMobile.value = window.innerWidth <= 768
}

const workoutTypes = ['gym', 'running', 'rest', 'other'];

const hexToRgb = (hex: string) => {
	const bigint = parseInt(hex.slice(1), 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;
	return `${r}, ${g}, ${b}`;
};

const applyGlobalCssColors = (colorsMap: { [key: string]: string }) => {
	const root = document.documentElement;
	for (const type of workoutTypes) {
		const hexColor = colorsMap[type];
		if (hexColor) {
			root.style.setProperty(`--color-${type}-primary`, hexColor);
			root.style.setProperty(`--color-${type}-primary-rgb`, hexToRgb(hexColor));
		}
	}
};

const fetchWorkoutTypeColors = async () => {
	try {
		const colors = await db.getWorkoutTypeColors();
		const colorsMap: { [key: string]: string } = {};
		workoutTypes.forEach(type => {
			const found = colors.find((c: any) => c.type === type);
			colorsMap[type] = found ? found.color : '#CCCCCC';
		});
		applyGlobalCssColors(colorsMap);
	} catch (error) {
		console.error('Error fetching workout type colors:', error);
	}
};

onMounted(() => {
	fetchWorkoutTypeColors();
	window.addEventListener('colors-updated', fetchWorkoutTypeColors);
	window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
	window.removeEventListener('resize', handleResize);
});
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
	width: 250px;
	background-color: #050505;
	border-right: 1px solid var(--border-color);
	display: flex;
	flex-direction: column;
	transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	padding: 10px;
	z-index: 1000;
}

.sidebar.collapsed {
	width: 80px;
}

/* Mobile Nav Styles */
.mobile-nav {
	display: none;
	position: fixed;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 60px;
	background-color: #050505;
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

.mobile-nav li {
	flex: 1;
}

.mobile-nav a {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: var(--accent-color);
	text-decoration: none;
	font-size: 0.6rem;
	gap: 4px;
	height: 100%;
	position: relative;
}

.mobile-nav .icon {
	font-size: 1rem;
}

.active-indicator {
	position: absolute;
	top: 0;
	width: 40%;
	height: 2px;
	background-color: var(--accent-color);
	box-shadow: 0 0 5px var(--accent-color);
}

@media (max-width: 768px) {
	.sidebar {
		display: none;
	}
	.mobile-nav {
		display: block;
	}
	.layout {
		flex-direction: column;
	}
	.main-content {
		padding-bottom: 70px; /* Space for mobile nav */
		height: calc(100vh - 60px);
	}
}

.sidebar-header {
	padding: 15px 10px;
	text-align: center;
	font-weight: bold;
	color: var(--accent-color);
	border-bottom: 1px solid var(--border-color);
	margin-bottom: 20px;
	position: relative;
}

.power-indicator {
	position: absolute;
	top: 5px;
	right: 5px;
	width: 6px;
	height: 6px;
	background-color: var(--accent-color);
	border-radius: 50%;
	box-shadow: 0 0 5px var(--accent-color);
	animation: blink 2s infinite;
}

@keyframes blink {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.3; }
}

.navigation ul {
	list-style: none;
	padding: 0;
	margin: 0;
}

.navigation li a {
	display: flex;
	align-items: center;
	padding: 12px 10px;
	color: var(--accent-color);
	text-decoration: none;
	white-space: nowrap;
	overflow: hidden;
	transition: all 0.2s ease;
	border-left: 3px solid transparent;
}

.navigation li a:hover {
	background-color: rgba(0, 179, 60, 0.1);
	border-left-color: var(--accent-color);
	padding-left: 15px;
}

.navigation li a.router-link-active {
	background-color: rgba(0, 179, 60, 0.05);
	border-left-color: var(--accent-color);
}

.navigation li a .prompt {
	margin-right: 10px;
	color: var(--accent-color);
}

.sidebar-footer {
	margin-top: auto;
	padding: 10px;
	border-top: 1px solid var(--border-color);
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.collapse-button,
.profile-link {
	background: transparent;
	border: 1px solid var(--border-color);
	color: var(--accent-color);
	padding: 8px;
	cursor: pointer;
	text-decoration: none;
	text-align: center;
	font-size: 0.7rem;
	transition: all 0.2s;
}

.collapse-button:hover,
.profile-link:hover {
	border-color: var(--accent-color);
	box-shadow: 0 0 10px var(--glow-color);
}

.main-content {
	flex: 1;
	overflow-y: auto;
	position: relative;
	z-index: 1;
	width: 100%;
}

/* Page Transition */
.fade-scan-enter-active,
.fade-scan-leave-active {
  transition: opacity 0.2s, transform 0.2s;
  width: 100%;
}

.fade-scan-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-scan-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
