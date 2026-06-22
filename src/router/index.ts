import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";

const routes = [
	{
		path: "/",
		name: "Home",
		component: HomeView,
	},
	{
		path: "/schedule",
		name: "Schedule",
		component: () => import("@/views/DashboardView.vue"),
	},
	{
		path: "/workout/:id",
		name: "WorkoutDetail",
		component: () => import("@/views/WorkoutDetailView.vue"),
	},
	{
		path: "/profile",
		name: "Profile",
		component: () => import("@/views/ProfileView.vue"),
	},
	{
		path: "/templates",
		name: "Templates",
		component: () => import("@/views/TemplatesView.vue"),
	},
	{
		path: "/exercises",
		name: "Exercises",
		component: () => import("@/views/ExercisesView.vue"),
	},
	// Legacy redirects
	{ path: "/overview", redirect: "/" },
	{ path: "/progress", redirect: "/" },
	{ path: "/dashboard", redirect: "/schedule" },
];

const router = createRouter({
	history: createWebHashHistory(),
	routes,
});

export default router;
