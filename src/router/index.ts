import { createRouter, createWebHashHistory } from "vue-router";
import LandingView from "@/views/LandingView.vue";

const routes = [
	{
		path: "/",
		name: "Landing",
		component: LandingView,
	},
	{
		path: "/overview",
		name: "Overview",
		component: () => import("@/views/OverviewView.vue"),
	},
	{
		path: "/dashboard",
		name: "Dashboard",
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
];

const router = createRouter({
	history: createWebHashHistory(),
	routes,
});

export default router;
