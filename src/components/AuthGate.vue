<template>
	<div class="auth-gate">
		<div class="auth-box" :class="{ shake: shaking }">
			<div class="auth-logo">
				<svg width="36" height="36" viewBox="0 0 36 36" fill="none">
					<circle cx="18" cy="18" r="18" fill="var(--primary-color)" fill-opacity="0.15" />
					<path d="M11 16V13a7 7 0 0 1 14 0v3" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round"/>
					<rect x="8" y="16" width="20" height="13" rx="3" fill="var(--primary-color)" fill-opacity="0.25" stroke="var(--primary-color)" stroke-width="1.5"/>
					<circle cx="18" cy="22.5" r="2" fill="var(--primary-color)"/>
				</svg>
			</div>
			<h1 class="auth-title">{{ mode === 'signin' ? 'Sign in' : 'Create account' }}</h1>
			<p class="auth-sub">Trainlog · your schedule &amp; stats, private to you</p>

			<form class="auth-form" @submit.prevent="submit">
				<input
					v-if="mode === 'signup'"
					v-model="name"
					type="text"
					class="auth-input"
					placeholder="Your name"
					autocomplete="name"
					:disabled="busy"
				/>
				<input
					v-model="email"
					type="email"
					class="auth-input"
					placeholder="Email"
					autocomplete="username"
					:disabled="busy"
				/>
				<input
					v-model="password"
					type="password"
					class="auth-input"
					placeholder="Password"
					:autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
					:disabled="busy"
				/>
				<button type="submit" class="auth-submit" :disabled="busy || !email || !password">
					{{ busy ? 'Please wait…' : (mode === 'signin' ? 'Sign in' : 'Sign up') }}
				</button>
			</form>

			<p v-if="errorMsg" class="auth-error">{{ errorMsg }}</p>
			<p v-if="infoMsg" class="auth-info">{{ infoMsg }}</p>

			<button
				v-if="mode === 'signin'"
				class="auth-forgot"
				type="button"
				:disabled="busy"
				@click="forgotPassword"
			>
				Forgot your password?
			</button>

			<button class="auth-toggle" type="button" :disabled="busy" @click="toggleMode">
				{{ mode === 'signin' ? "No account yet? Create one" : 'Have an account? Sign in' }}
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { resetPassword, signIn, signUp } from '../auth'

const mode = ref<'signin' | 'signup'>('signin')
const name = ref('')
const email = ref('')
const password = ref('')
const busy = ref(false)
const shaking = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')

function toggleMode() {
	mode.value = mode.value === 'signin' ? 'signup' : 'signin'
	errorMsg.value = ''
	infoMsg.value = ''
}

/**
 * Supabase's raw errors are written for developers. "Invalid login credentials"
 * is technically accurate and tells a friend with a typo'd password nothing
 * about what to do next.
 */
function humanError(e: any): string {
	const raw = String(e?.message || '').toLowerCase()
	if (raw.includes('invalid login credentials')) return 'That email and password don’t match. Check them and try again.'
	if (raw.includes('already registered') || raw.includes('already been registered')) return 'There’s already an account with that email. Try signing in instead.'
	if (raw.includes('email not confirmed')) return 'Check your inbox and confirm your email first, then sign in.'
	if (raw.includes('rate limit') || raw.includes('too many')) return 'Too many attempts. Wait a minute and try again.'
	if (raw.includes('password')) return 'That password won’t work — it needs to be at least 6 characters.'
	if (raw.includes('fetch') || raw.includes('network')) return 'Couldn’t reach the server. Check your connection.'
	return 'Something went wrong. Try again in a moment.'
}

async function forgotPassword() {
	if (busy.value) return
	if (!email.value.trim()) {
		fail('Enter your email above first, then tap this again.')
		return
	}
	errorMsg.value = ''
	busy.value = true
	try {
		await resetPassword(email.value.trim())
		infoMsg.value = 'If that email has an account, a reset link is on its way.'
	} catch (e) {
		fail(humanError(e))
	} finally {
		busy.value = false
	}
}

function fail(msg: string) {
	errorMsg.value = msg
	shaking.value = true
	setTimeout(() => { shaking.value = false }, 600)
}

async function submit() {
	if (!email.value || !password.value || busy.value) return
	errorMsg.value = ''
	infoMsg.value = ''
	busy.value = true
	try {
		if (mode.value === 'signin') {
			await signIn(email.value.trim(), password.value)
			// A successful sign-in flips auth.user; App.vue swaps this gate for the app.
		} else {
			if (password.value.length < 6) {
				fail('Password must be at least 6 characters.')
				return
			}
			await signUp(email.value.trim(), password.value, name.value)
			// With email confirmation off, sign-up returns a session and we're in.
			// With it on, there's no session yet — tell them to check their inbox.
			infoMsg.value = 'Account created. If nothing happens, confirm your email, then sign in.'
			mode.value = 'signin'
			password.value = ''
		}
	} catch (e: any) {
		fail(humanError(e))
	} finally {
		busy.value = false
	}
}
</script>

<style scoped>
.auth-gate {
	position: fixed;
	inset: 0;
	z-index: var(--z-pin-gate);
	background: var(--background-color);
	display: flex;
	align-items: center;
	justify-content: center;
}

.auth-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 320px;
	max-width: calc(100vw - 40px);
}

.auth-logo { margin-bottom: 20px; }

.auth-title {
	font-size: 1.5rem;
	font-family: var(--font-serif);
	font-weight: 400;
	margin: 0 0 6px;
	color: var(--text-color);
}

.auth-sub {
	font-size: 0.8rem;
	color: var(--text-muted);
	margin: 0 0 24px;
	text-align: center;
}

.auth-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
	width: 100%;
}

.auth-input {
	height: 46px;
	padding: 0 14px;
	font-size: 0.95rem;
	background: var(--surface-color);
	border: 1.5px solid var(--border-strong);
	border-radius: var(--radius);
	color: var(--text-color);
	outline: none;
	transition: border-color 0.15s, box-shadow 0.15s;
	box-sizing: border-box;
}

.auth-input:focus {
	border-color: var(--primary-color);
	box-shadow: 0 0 0 3px var(--primary-soft);
}

.auth-submit {
	height: 46px;
	margin-top: 4px;
	border: none;
	border-radius: var(--radius);
	background: var(--primary-color);
	color: #fff;
	font-size: 0.95rem;
	font-weight: 600;
	font-family: inherit;
	cursor: pointer;
	transition: opacity 0.15s;
}

.auth-submit:disabled { opacity: 0.55; cursor: default; }

.auth-error {
	margin: 14px 0 0;
	font-size: 0.8rem;
	color: var(--danger-color);
	text-align: center;
}

.auth-info {
	margin: 14px 0 0;
	font-size: 0.8rem;
	color: var(--text-secondary);
	text-align: center;
	line-height: 1.5;
}

.auth-forgot {
	margin-top: 16px;
	background: none;
	border: none;
	color: var(--text-muted);
	font-size: 0.78rem;
	font-family: inherit;
	cursor: pointer;
	padding: 4px;
}
.auth-forgot:hover { color: var(--text-secondary); }
.auth-forgot:disabled { opacity: 0.55; cursor: default; }

.auth-toggle {
	margin-top: 8px;
	background: none;
	border: none;
	color: var(--primary-color);
	font-size: 0.82rem;
	font-family: inherit;
	cursor: pointer;
	padding: 4px;
}

.auth-toggle:disabled { opacity: 0.55; cursor: default; }

@keyframes shake {
	0%, 100% { transform: translateX(0); }
	20%       { transform: translateX(-8px); }
	40%       { transform: translateX(8px); }
	60%       { transform: translateX(-6px); }
	80%       { transform: translateX(6px); }
}

.shake { animation: shake 0.6s ease; }
</style>
