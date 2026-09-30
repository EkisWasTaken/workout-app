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
			<h1 class="auth-title">{{ TITLES[mode] }}</h1>
			<p class="auth-sub">
				<template v-if="mode === 'newpassword'">Choose a new password for {{ auth.user?.email }}</template>
				<template v-else>Trainlog · your schedule &amp; stats, private to you</template>
			</p>

			<p v-if="auth.linkError && mode !== 'newpassword'" class="auth-error top">{{ auth.linkError }}</p>

			<!-- Arrived from a reset link: already signed in, but not let in until
			     a new password is set — that's what the link was for. -->
			<form v-if="mode === 'newpassword'" class="auth-form" @submit.prevent="submitNewPassword">
				<input
					v-model="password"
					type="password"
					class="auth-input"
					placeholder="New password"
					autocomplete="new-password"
					:disabled="busy"
				/>
				<input
					v-model="confirm"
					type="password"
					class="auth-input"
					placeholder="Repeat new password"
					autocomplete="new-password"
					:disabled="busy"
				/>
				<button type="submit" class="auth-submit" :disabled="busy || !password || !confirm">
					{{ busy ? 'Please wait…' : 'Save password' }}
				</button>
			</form>

			<form v-else class="auth-form" @submit.prevent="submit">
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
				<input
					v-if="mode === 'signup'"
					v-model="inviteCode"
					type="text"
					class="auth-input"
					placeholder="Invite code"
					autocomplete="off"
					autocapitalize="characters"
					spellcheck="false"
					:disabled="busy"
				/>
				<button type="submit" class="auth-submit" :disabled="busy || !email || !password || (mode === 'signup' && !inviteCode.trim())">
					{{ busy ? 'Please wait…' : (mode === 'signin' ? 'Sign in' : 'Sign up') }}
				</button>
			</form>

			<p v-if="errorMsg" class="auth-error">{{ errorMsg }}</p>
			<p v-if="infoMsg" class="auth-info">{{ infoMsg }}</p>

			<template v-if="mode === 'newpassword'">
				<button class="auth-toggle" type="button" :disabled="busy" @click="cancelReset">
					Cancel and sign out
				</button>
			</template>
			<template v-else>
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
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { auth, resetPassword, signIn, signOut, signUp, updatePassword } from '../auth'

type Mode = 'signin' | 'signup' | 'newpassword'

const TITLES: Record<Mode, string> = {
	signin: 'Sign in',
	signup: 'Create account',
	newpassword: 'Set a new password',
}

const formMode = ref<'signin' | 'signup'>('signin')
const mode = computed<Mode>(() => (auth.recovering && auth.user ? 'newpassword' : formMode.value))
const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const inviteCode = ref('')
const busy = ref(false)
const shaking = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')

function toggleMode() {
	formMode.value = formMode.value === 'signin' ? 'signup' : 'signin'
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
	// The invite check runs in a database trigger, and Supabase reports any
	// trigger refusal during sign-up as this one generic message.
	if (mode.value === 'signup' && (raw.includes('database error') || raw.includes('invalid_invite_code'))) {
		return 'That invite code isn’t valid, or it has been used up. Check it with whoever invited you.'
	}
	if (raw.includes('invalid login credentials')) return 'That email and password don’t match. Check them and try again.'
	if (raw.includes('already registered') || raw.includes('already been registered')) return 'There’s already an account with that email. Try signing in instead.'
	if (raw.includes('email not confirmed')) return 'Check your inbox and confirm your email first, then sign in.'
	if (raw.includes('rate limit') || raw.includes('too many')) return 'Too many attempts. Wait a minute and try again.'
	if (raw.includes('same') && raw.includes('password')) return 'That’s your current password. Pick a new one.'
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
	auth.linkError = null
	busy.value = true
	try {
		await resetPassword(email.value.trim())
		infoMsg.value = 'If that email has an account, a reset link is on its way. Open it in this browser.'
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
	auth.linkError = null
	busy.value = true
	try {
		if (formMode.value === 'signin') {
			await signIn(email.value.trim(), password.value)
			// A successful sign-in flips auth.user; App.vue swaps this gate for the app.
		} else {
			if (password.value.length < 6) {
				fail('Password must be at least 6 characters.')
				return
			}
			await signUp(email.value.trim(), password.value, name.value, inviteCode.value)
			// With email confirmation off, sign-up returns a session and we're in.
			// With it on, there's no session yet — tell them to check their inbox.
			infoMsg.value = 'Account created. If nothing happens, confirm your email, then sign in.'
			formMode.value = 'signin'
			password.value = ''
			inviteCode.value = ''
		}
	} catch (e: any) {
		fail(humanError(e))
	} finally {
		busy.value = false
	}
}

async function submitNewPassword() {
	if (busy.value) return
	errorMsg.value = ''
	if (password.value.length < 6) {
		fail('Password must be at least 6 characters.')
		return
	}
	if (password.value !== confirm.value) {
		fail('The two passwords don’t match.')
		return
	}
	busy.value = true
	try {
		await updatePassword(password.value)
		// Clearing auth.recovering lets App.vue swap this gate for the app.
		password.value = ''
		confirm.value = ''
	} catch (e: any) {
		fail(humanError(e))
	} finally {
		busy.value = false
	}
}

async function cancelReset() {
	busy.value = true
	try {
		await signOut()
	} catch {
		// Signed out locally either way; the gate falls back to sign-in.
	} finally {
		auth.recovering = false
		password.value = ''
		confirm.value = ''
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
	overflow-wrap: anywhere;
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
	background: var(--primary-fill);
	color: var(--on-primary);
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
.auth-error.top { margin: -8px 0 16px; }

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
