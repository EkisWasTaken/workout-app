import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const isElectron = mode === 'electron';
	
	return {
		// Replace 'YOUR_REPO_NAME' with your actual GitHub repository name if deploying to username.github.io/repo-name/
		// If you are using a custom domain or username.github.io, set this to '/'
		base: './', 
		plugins: [
			vue(),
			isElectron && electron({
				main: {
					entry: "electron/main.ts",
					vite: {
						build: {
							rollupOptions: {
								external: ["sqlite3"],
							},
						},
					},
				},
				preload: {
					input: path.join(__dirname, "electron/preload.ts"),
				},
				renderer: process.env.NODE_ENV === "test" ? undefined : {},
			}),
		].filter(Boolean),
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "src"),
			},
		},
		build: {
			outDir: isElectron ? 'dist-electron' : 'dist',
		}
	}
});
