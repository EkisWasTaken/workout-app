<template>
	<n-card bordered class="settings-card">
		<template #header><span class="card-title">Account</span></template>

		<div class="account-row">
			<div class="account-info">
				<span class="account-label">Signed in as</span>
				<span class="account-email">{{ auth.user?.email || '—' }}</span>
				<span v-if="pendingEmail" class="account-pending">
					Waiting for you to confirm {{ pendingEmail }} from your inbox.
				</span>
			</div>
			<n-button @click="handleSignOut" tertiary>Sign out</n-button>
		</div>

		<div class="account-actions">
			<n-button size="small" quaternary :type="open === 'password' ? 'primary' : 'default'" @click="toggle('password')">
				Change password
			</n-button>
			<n-button size="small" quaternary :type="open === 'email' ? 'primary' : 'default'" @click="toggle('email')">
				Change email
			</n-button>
			<n-button size="small" quaternary :type="open === 'delete' ? 'error' : 'default'" @click="toggle('delete')">
				Delete account
			</n-button>
		</div>

		<!-- Every change here asks for the current password first: an open
		     session on a shared computer shouldn't be enough to lock the owner out. -->
		<form v-if="open === 'password'" class="account-form" @submit.prevent="changePassword">
			<n-input v-model:value="current" type="password" placeholder="Current password"
				:input-props="{ autocomplete: 'current-password' }" />
			<n-input v-model:value="next" type="password" placeholder="New password (at least 6 characters)"
				:input-props="{ autocomplete: 'new-password' }" />
			<n-input v-model:value="repeat" type="password" placeholder="Repeat new password"
				:input-props="{ autocomplete: 'new-password' }" />
			<n-button attr-type="submit" type="primary" :loading="busy" :disabled="!current || !next || !repeat">
				Save password
			</n-button>
		</form>

		<form v-else-if="open === 'email'" class="account-form" @submit.prevent="changeEmail">
			<n-input v-model:value="newEmail" placeholder="New email"
				:input-props="{ type: 'email', autocomplete: 'email' }" />
			<n-input v-model:value="current" type="password" placeholder="Current password"
				:input-props="{ autocomplete: 'current-password' }" />
			<n-button attr-type="submit" type="primary" :loading="busy" :disabled="!newEmail.trim() || !current">
				Change email
			</n-button>
		</form>

		<form v-else-if="open === 'delete'" class="account-form danger" @submit.prevent="removeAccount">
			<p class="danger-text">
				This permanently deletes your account and <strong>everything in it</strong>: your schedule,
				logged workouts, imported recordings, weights, goals, progress photos and the templates
				you created. It can't be undone.
			</p>
			<n-input v-model:value="confirmWord" placeholder="Type DELETE to confirm" />
			<n-input v-model:value="current" type="password" placeholder="Current password"
				:input-props="{ autocomplete: 'current-password' }" />
			<n-button attr-type="submit" type="error" :loading="busy" :disabled="confirmWord.trim() !== 'DELETE' || !current">
				Delete my account
			</n-button>
		</form>
	</n-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NInput, useMessage } from 'naive-ui'
import { auth, deleteAccount, signOut, updateEmail, updatePassword, verifyPassword } from '@/auth'
import { isOwner, GENERIC_SCHEMA_MESSAGE } from '@/owner'

type Panel = 'password' | 'email' | 'delete' | null

const message = useMessage()
const open = ref<Panel>(null)
const busy = ref(false)
const current = ref('')
const next = ref('')
const repeat = ref('')
const newEmail = ref('')
const confirmWord = ref('')

/** Supabase keeps a requested-but-unconfirmed address here until it's confirmed. */
const pendingEmail = computed(() => auth.user?.new_email || null)

function clearForm() {
	current.value = ''
	next.value = ''
	repeat.value = ''
	newEmail.value = ''
	confirmWord.value = ''
}

function toggle(panel: Exclude<Panel, null>) {
	open.value = open.value === panel ? null : panel
	clearForm()
}

async function handleSignOut() {
	try {
		await signOut()
	} catch (e: any) {
		message.error(e?.message || 'Failed to sign out')
	}
}

/** Run `fn` only once the current password checks out. */
async function withPassword(fn: () => Promise<void>) {
	if (busy.value) return
	busy.value = true
	try {
		if (!(await verifyPassword(current.value))) {
			message.error('Your current password isn’t right.')
			return
		}
		await fn()
	} catch (e: any) {
		message.error(friendly(e))
	} finally {
		busy.value = false
	}
}

function friendly(e: any): string {
	const raw = String(e?.message || '').toLowerCase()
	if (raw.includes('same') && raw.includes('password')) return 'That’s already your password. Pick a new one.'
	if (raw.includes('password')) return 'That password won’t work. It needs at least 6 characters.'
	if (raw.includes('already') && raw.includes('registered')) return 'Another account already uses that email.'
	if (raw.includes('email') && raw.includes('invalid')) return 'That doesn’t look like a valid email address.'
	if (raw.includes('rate limit') || raw.includes('too many')) return 'Too many attempts. Wait a minute and try again.'
	// The delete function arrives with supabase_invites.sql.
	if (raw.includes('delete_my_account') || e?.code === 'PGRST202') {
		return isOwner.value ? 'Run supabase_invites.sql in Supabase first.' : GENERIC_SCHEMA_MESSAGE
	}
	return e?.message || 'Something went wrong. Try again in a moment.'
}

function changePassword() {
	if (next.value.length < 6) return message.error('The new password needs at least 6 characters.')
	if (next.value !== repeat.value) return message.error('The two new passwords don’t match.')
	return withPassword(async () => {
		await updatePassword(next.value)
		message.success('Password changed.')
		open.value = null
		clearForm()
	})
}

function changeEmail() {
	const email = newEmail.value.trim()
	if (email.toLowerCase() === (auth.user?.email || '').toLowerCase()) {
		return message.error('That’s already your email.')
	}
	return withPassword(async () => {
		const changed = await updateEmail(email)
		message.success(changed
			? 'Email changed. Use it to sign in from now on.'
			: 'Check your inbox to confirm the new address. Until then, keep signing in with the old one.')
		open.value = null
		clearForm()
	})
}

function removeAccount() {
	return withPassword(async () => {
		await deleteAccount()
		// Signed out: App.vue swaps back to the sign-in screen.
		message.success('Your account has been deleted.')
	})
}
</script>

<style scoped>
.settings-card { border-radius: var(--radius) !important; }
.card-title { font-size: 1rem; font-weight: 600; color: var(--text-color); }

.account-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.account-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.account-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
/* A long address has no spaces to break at, so it must be allowed to break
   anywhere — otherwise it forces the card wider than the phone. */
.account-email { font-size: 0.9rem; color: var(--text-color); font-weight: 500; overflow-wrap: anywhere; }
.account-pending { font-size: 0.75rem; color: var(--text-muted); overflow-wrap: anywhere; }

.account-actions {
	display: flex; flex-wrap: wrap; gap: 4px;
	margin-top: 14px; padding-top: 12px;
	border-top: 1px solid var(--border-color);
}

.account-form { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.account-form .n-button { align-self: flex-start; }

.danger-text { margin: 0; font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary); }
.account-form.danger {
	padding: 12px; border-radius: var(--radius-sm);
	background: var(--danger-soft); border: 1px solid var(--danger-color);
}

@media (max-width: 620px) {
	.settings-card :deep(.n-card__content),
	.settings-card :deep(.n-card-header) { padding-left: 14px; padding-right: 14px; }
	.account-row { flex-direction: column; align-items: stretch; }
}
</style>
