import { defineConfig } from "vite";
import path from "node:path";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
	base: './',
	plugins: [vue()],
	build: {
		rollupOptions: {
			output: {
				// Framework code changes far less often than the app, so it gets its own long-cached file.
				manualChunks: (id: string) =>
					/node_modules\/(@supabase|@vue|vue|vue-router)\//.test(id) ? 'vendor' : undefined,
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
});
