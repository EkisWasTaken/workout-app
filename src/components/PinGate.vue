<template>
	<div v-if="!unlocked" class="pin-gate">
		<div class="pin-box" :class="{ shake: shaking }">
			<div class="pin-logo">
				<svg width="36" height="36" viewBox="0 0 36 36" fill="none">
					<circle cx="18" cy="18" r="18" fill="var(--primary-color)" fill-opacity="0.15" />
					<path d="M11 16V13a7 7 0 0 1 14 0v3" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round"/>
					<rect x="8" y="16" width="20" height="13" rx="3" fill="var(--primary-color)" fill-opacity="0.25" stroke="var(--primary-color)" stroke-width="1.5"/>
					<circle cx="18" cy="22.5" r="2" fill="var(--primary-color)"/>
				</svg>
			</div>
			<h1 class="pin-title">Enter PIN</h1>

			<div class="pin-inputs">
				<input
					v-for="i in 4"
					:key="i"
					:ref="el => { if (el) inputs[i - 1] = el as HTMLInputElement }"
					v-model="digits[i - 1]"
					type="password"
					inputmode="numeric"
					maxlength="1"
					class="pin-input"
					:class="{ error: shaking }"
					@input="onInput(i - 1)"
					@keydown="onKeydown($event, i - 1)"
					@paste="onPaste"
					autocomplete="off"
				/>
			</div>

			<p v-if="errorMsg" class="pin-error">{{ errorMsg }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const PIN_HASH = 'b84e4d71547e781cd9665620b478b13943484194a43f42578f7e88dc01fcc862'
const SESSION_KEY = 'wa_unlocked'

const unlocked = ref(false)
const digits = ref(['', '', '', ''])
const inputs = ref<HTMLInputElement[]>([])
const shaking = ref(false)
const errorMsg = ref('')

async function sha256(str: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
	return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function check() {
	const pin = digits.value.join('')
	if (pin.length < 4) return
	const hash = await sha256(pin)
	if (hash === PIN_HASH) {
		sessionStorage.setItem(SESSION_KEY, '1')
		unlocked.value = true
	} else {
		shaking.value = true
		errorMsg.value = 'Incorrect PIN'
		setTimeout(() => {
			shaking.value = false
			errorMsg.value = ''
			digits.value = ['', '', '', '']
			nextTick(() => inputs.value[0]?.focus())
		}, 700)
	}
}

function onInput(i: number) {
	const val = digits.value[i]
	if (!/^\d$/.test(val)) {
		digits.value[i] = ''
		return
	}
	if (i < 3) {
		nextTick(() => inputs.value[i + 1]?.focus())
	} else {
		nextTick(check)
	}
}

function onKeydown(e: KeyboardEvent, i: number) {
	if (e.key === 'Backspace' && !digits.value[i] && i > 0) {
		digits.value[i - 1] = ''
		nextTick(() => inputs.value[i - 1]?.focus())
	}
}

function onPaste(e: ClipboardEvent) {
	e.preventDefault()
	const text = e.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, 4) ?? ''
	text.split('').forEach((ch, i) => { digits.value[i] = ch })
	nextTick(() => {
		const next = Math.min(text.length, 3)
		inputs.value[next]?.focus()
		if (text.length === 4) check()
	})
}

onMounted(() => {
	if (sessionStorage.getItem(SESSION_KEY) === '1') {
		unlocked.value = true
		return
	}
	nextTick(() => inputs.value[0]?.focus())
})
</script>

<style scoped>
.pin-gate {
	position: fixed;
	inset: 0;
	z-index: 9999;
	background: var(--background-color);
	display: flex;
	align-items: center;
	justify-content: center;
}

.pin-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0;
	width: 320px;
	max-width: calc(100vw - 40px);
}

.pin-logo { margin-bottom: 20px; }

.pin-title {
	font-size: 1.5rem;
	font-family: var(--font-serif);
	font-weight: 400;
	margin: 0 0 28px;
	color: var(--text-color);
}

.pin-inputs {
	display: flex;
	gap: 12px;
	margin-bottom: 20px;
}

.pin-input {
	width: 52px;
	height: 60px;
	text-align: center;
	font-size: 1.5rem;
	font-family: var(--font-mono);
	background: var(--surface-color);
	border: 1.5px solid var(--border-strong);
	border-radius: var(--radius);
	color: var(--text-color);
	outline: none;
	transition: border-color 0.15s, box-shadow 0.15s;
	-webkit-text-security: disc;
}

.pin-input:focus {
	border-color: var(--primary-color);
	box-shadow: 0 0 0 3px var(--primary-soft);
}

.pin-input.error {
	border-color: var(--danger-color);
	box-shadow: 0 0 0 3px var(--danger-soft);
}

.pin-error {
	margin: 6px 0 0;
	font-size: 0.8rem;
	color: var(--danger-color);
	text-align: center;
}

@keyframes shake {
	0%, 100% { transform: translateX(0); }
	20%       { transform: translateX(-8px); }
	40%       { transform: translateX(8px); }
	60%       { transform: translateX(-6px); }
	80%       { transform: translateX(6px); }
}

.shake { animation: shake 0.6s ease; }
</style>
