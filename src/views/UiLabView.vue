<script setup lang="ts">
/**
 * The UI lab: pick a look, watch the whole app take it.
 *
 * Deliberately not a sandbox. Everything is written straight onto `<html>` —
 * colours as custom properties, style choices as `data-ui-*` attributes — so
 * the sidebar beside you and every other page are already showing the change.
 * You can pick a palette here, walk to the schedule, and judge it on real data.
 * A preview pane rendering its own fake buttons only ever tells you about the
 * preview pane.
 *
 * Structured as choices, not dials: twenty complete palettes and eleven named
 * style switches. Per-token colour editing still exists, but it is folded away
 * at the bottom, because reaching for a colour picker is the rare case and
 * picking a theme is the common one.
 */
import { computed, ref } from 'vue'
import { NIcon, useMessage } from 'naive-ui'
import { CheckmarkCircle, CopyOutline, RefreshOutline, ReloadOutline } from '@vicons/ionicons5'
import {
	TOKEN_GROUPS, activePalette, anyChanges, contrast, currentValue, defaultValue, exportCss,
	grade, isOverridden, overrideCount, resetAll, resetToken, setPalette, setStyle, setToken,
	styleCount, styleValue, toHex, type TokenDef,
} from '@/uiLab'
import { FAMILIES, PALETTES } from '@/uiLabPalettes'
import { STYLE_SWITCHES } from '@/uiLabStyles'

const message = useMessage()
const showAdvanced = ref(false)
const openGroup = ref('')
const showCss = ref(false)

// ─── palettes ─────────────────────────────────────────────────────────────────

const family = ref<'all' | (typeof FAMILIES)[number]['key']>('all')

const shownPalettes = computed(() =>
	family.value === 'all' ? PALETTES : PALETTES.filter(p => p.family === family.value))

function pickPalette(key: string) {
	const palette = PALETTES.find(p => p.key === key)
	if (!palette) return
	setPalette(key, palette.values)
	message.success(`${palette.label} applied.`)
}

// ─── style switches ───────────────────────────────────────────────────────────

const optionHint = (key: string) => {
	const sw = STYLE_SWITCHES.find(s => s.key === key)
	return sw?.options.find(o => o.value === styleValue(key))?.hint ?? null
}

// ─── fine tuning ──────────────────────────────────────────────────────────────

const colourGroups = computed(() => TOKEN_GROUPS.filter(g => g.tokens.some(t => t.kind === 'color')))
const toggleGroup = (key: string) => { openGroup.value = openGroup.value === key ? '' : key }

function onColor(token: TokenDef, event: Event) {
	setToken(token.name, (event.target as HTMLInputElement).value)
}

// ─── contrast ─────────────────────────────────────────────────────────────────

/**
 * The palette's own promise is that every text colour clears AA on a card. The
 * generated palettes are built to hold that, but a hand-tweaked colour or a
 * chosen accent can still break it, so it is checked live rather than
 * discovered later on a chart.
 */
const CONTRAST_PAIRS = [
	{ label: 'Primary text on card', fg: 'text-color', bg: 'surface-color' },
	{ label: 'Secondary text on card', fg: 'text-secondary', bg: 'surface-color' },
	{ label: 'Muted text on card', fg: 'text-muted', bg: 'surface-color' },
	{ label: 'Accent on card', fg: 'primary-color', bg: 'surface-color' },
	{ label: 'White on button fill', fg: '#ffffff', bg: 'primary-fill' },
	{ label: 'Running on card', fg: 'color-running-primary', bg: 'surface-color' },
	{ label: 'Better on card', fg: 'success-color', bg: 'surface-color' },
	{ label: 'Problem on card', fg: 'danger-color', bg: 'surface-color' },
]

const resolve = (token: string) => (token.startsWith('#') ? token : currentValue(token))

const contrastRows = computed(() =>
	CONTRAST_PAIRS.map(p => {
		const fg = resolve(p.fg)
		const bg = resolve(p.bg)
		const ratio = contrast(fg, bg)
		return {
			...p, fg, bg,
			ratio: ratio === null ? null : Math.round(ratio * 100) / 100,
			verdict: ratio === null ? null : grade(ratio),
		}
	}))

const failing = computed(() => contrastRows.value.filter(r => r.verdict === 'Fail').length)

// ─── reset & export ───────────────────────────────────────────────────────────

function handleResetAll() {
	if (!anyChanges.value) return
	if (!window.confirm('Go back to the shipped look and discard every change?')) return
	resetAll()
	message.success('Back to stock.')
}

async function copyCss() {
	try {
		await navigator.clipboard.writeText(exportCss())
		message.success('Copied. Paste it into styles/app.css to make it the default.')
	} catch {
		showCss.value = true
		message.warning('Clipboard blocked — the CSS is shown below instead.')
	}
}

const css = computed(() => exportCss())

// ─── specimen ─────────────────────────────────────────────────────────────────

const SPORTS = ['running', 'gym', 'bike', 'rest', 'other']

const sparkPath = (seed: number) => {
	let v = seed
	const pts = Array.from({ length: 24 }, (_, i) => {
		v = (v * 16807) % 2147483647
		return [i * (200 / 23), 42 - ((v / 2147483647) * 0.6 + 0.2) * 40] as const
	})
	return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
}
</script>

<template>
	<div class="lab-wrapper">
		<div class="lab">
			<header class="page-head">
				<div>
					<h1 class="page-title">UI lab</h1>
					<p class="sub">
						Pick a look and the whole app takes it, straight away and remembered on this device.
						Walk to another page to judge it on real data, then come back.
					</p>
				</div>
				<div class="head-actions">
					<span v-if="styleCount" class="count-pill">{{ styleCount }} tweak{{ styleCount === 1 ? '' : 's' }}</span>
					<button class="action-button" :disabled="!anyChanges" @click="copyCss">
						<n-icon :component="CopyOutline" /> Copy CSS
					</button>
					<button class="action-button" :disabled="!anyChanges" @click="handleResetAll">
						<n-icon :component="ReloadOutline" /> Reset
					</button>
				</div>
			</header>

			<!-- Palette gallery -->
			<section class="card lab-card">
				<div class="card-head">
					<h2 class="card-title">Palette</h2>
					<div class="family-tabs">
						<button class="family" :class="{ on: family === 'all' }" @click="family = 'all'">All</button>
						<button v-for="f in FAMILIES" :key="f.key" class="family"
							:class="{ on: family === f.key }" @click="family = f.key">{{ f.label }}</button>
					</div>
				</div>

				<div class="palette-grid">
					<button
						v-for="p in shownPalettes"
						:key="p.key"
						class="palette"
						:class="{ on: activePalette === p.key }"
						:title="p.blurb"
						@click="pickPalette(p.key)"
					>
						<!-- The tile is painted in the palette's own colours, so it shows
						     what it does rather than describing it. -->
						<span class="palette-tile" :style="{ background: p.values['background-color'] }">
							<span class="palette-card" :style="{
								background: p.values['surface-color'],
								borderColor: p.values['border-color'],
							}">
								<span class="palette-bar" :style="{ background: p.values['primary-color'] }"></span>
								<span class="palette-dots">
									<i :style="{ background: p.values['color-running-primary'] }"></i>
									<i :style="{ background: p.values['color-gym-primary'] }"></i>
									<i :style="{ background: p.values['color-bike-primary'] }"></i>
								</span>
								<span class="palette-lines">
									<i :style="{ background: p.values['text-color'] }"></i>
									<i :style="{ background: p.values['text-muted'] }"></i>
								</span>
							</span>
						</span>
						<span class="palette-name">
							{{ p.label }}
							<n-icon v-if="activePalette === p.key" :component="CheckmarkCircle" class="palette-check" />
						</span>
						<span class="palette-blurb">{{ p.blurb }}</span>
					</button>
				</div>
			</section>

			<div class="lab-columns">
				<div class="lab-controls">
					<!-- Style switches -->
					<section class="card lab-card">
						<div class="card-head">
							<h2 class="card-title">Style</h2>
							<span class="card-note">Shape, weight and spacing. Independent of the palette.</span>
						</div>

						<div v-for="sw in STYLE_SWITCHES" :key="sw.key" class="switch">
							<div class="switch-head">
								<span class="switch-label">{{ sw.label }}</span>
								<button v-if="styleValue(sw.key) !== sw.fallback" class="switch-reset"
									title="Back to default" @click="setStyle(sw.key, sw.fallback)">
									<n-icon :component="RefreshOutline" />
								</button>
							</div>
							<div class="segmented" role="radiogroup" :aria-label="sw.label">
								<button
									v-for="opt in sw.options"
									:key="opt.value"
									class="seg"
									:class="{ on: styleValue(sw.key) === opt.value }"
									role="radio"
									:aria-checked="styleValue(sw.key) === opt.value"
									@click="setStyle(sw.key, opt.value)"
								>{{ opt.label }}</button>
							</div>
							<p class="switch-blurb">{{ optionHint(sw.key) ?? sw.blurb }}</p>
						</div>
					</section>

					<!-- Fine tuning, folded away -->
					<section class="card lab-card">
						<button class="group-head" @click="showAdvanced = !showAdvanced">
							<span class="group-name">Fine tuning</span>
							<span v-if="overrideCount" class="group-dot" :title="`${overrideCount} changed`"></span>
							<span class="group-caret">{{ showAdvanced ? '−' : '+' }}</span>
						</button>
						<div v-if="showAdvanced" class="group-body">
							<p class="switch-blurb wide">
								Individual colours, on top of whichever palette is applied. Worth reaching for when a
								palette is nearly right — a sport that clashes with your route map, say.
							</p>
							<div v-for="group in colourGroups" :key="group.key" class="subgroup">
								<button class="subgroup-head" @click="toggleGroup(group.key)">
									<span>{{ group.label }}</span>
									<span class="group-caret">{{ openGroup === group.key ? '−' : '+' }}</span>
								</button>
								<div v-if="openGroup === group.key" class="subgroup-body">
									<div v-for="token in group.tokens.filter(t => t.kind === 'color')" :key="token.name" class="token">
										<label :for="`t-${token.name}`" class="token-label">{{ token.label }}</label>
										<input
											:id="`t-${token.name}`"
											type="color"
											class="swatch-input"
											:value="toHex(currentValue(token.name))"
											@input="onColor(token, $event)"
										/>
										<span class="token-value mono">{{ toHex(currentValue(token.name)) }}</span>
										<button v-if="isOverridden(token.name)" class="switch-reset"
											:title="`Back to ${defaultValue(token.name)}`" @click="resetToken(token.name)">
											<n-icon :component="RefreshOutline" />
										</button>
									</div>
								</div>
							</div>
						</div>
					</section>
				</div>

				<!-- Specimen -->
				<div class="lab-preview">
					<section class="card lab-card">
						<div class="card-head">
							<h2 class="card-title">Specimen</h2>
							<span class="card-note">The app's own classes, not copies.</span>
						</div>

						<h1 class="page-title spec-title">Good evening, Elias</h1>
						<p class="spec-body">
							Body text at its normal size, with a <a href="#/ui-lab">link</a> and a
							<strong>bold run</strong> in it.
						</p>
						<p class="spec-secondary">Secondary — labels, captions, the note under a chart.</p>
						<p class="spec-muted">Muted — asides you can skip.</p>

						<div class="spec-row">
							<button class="action-button primary">Primary</button>
							<button class="action-button">Secondary</button>
							<button class="action-button delete-button">Delete</button>
						</div>

						<div class="spec-row">
							<input class="spec-field" value="An input" />
							<select class="spec-field"><option>A select</option></select>
						</div>

						<div class="spec-row">
							<span class="spec-pill verdict-good"><n-icon :component="CheckmarkCircle" /> Better</span>
							<span class="spec-pill verdict-warn">+18% vs last week</span>
							<span class="spec-pill verdict-bad">Missed</span>
							<span class="spec-pill pr">PR</span>
						</div>

						<div class="spec-sports">
							<div v-for="s in SPORTS" :key="s" class="spec-sport"
								:style="{ '--tag-color': `var(--color-${s}-primary)`, '--tag-soft': `var(--color-${s}-soft)` }">
								<span class="spec-sport-chip">{{ s }}</span>
								<svg viewBox="0 0 200 46" class="spec-spark" preserveAspectRatio="none">
									<path :d="sparkPath(s.length * 977 + 13)" fill="none"
										:stroke="`var(--color-${s}-primary)`" stroke-width="2"
										stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</div>
						</div>

						<!-- A real calendar chip and week card, so the chip and accent-edge
						     switches can be judged on the thing they actually change. -->
						<div class="spec-chips">
							<div class="chip workout workout-running"><span class="chip-ico">▸</span><span class="chip-name">Threshold 5×1k</span><span class="chip-meta">12 km</span></div>
							<div class="chip workout workout-gym"><span class="chip-ico">▸</span><span class="chip-name">Push day</span></div>
						</div>

						<div class="wv-card workout-running spec-wvcard">
							<span class="wv-badge"><n-icon :component="CheckmarkCircle" /></span>
							<div class="wv-body">
								<div class="wv-cardtop"><span class="wv-name">Long run</span></div>
								<div class="wv-pills">
									<span class="wv-pill">17 km</span>
									<span class="wv-pill">95 min</span>
									<span class="wv-pill wv-pill-pace basis-fitness">Easy · 5:45–6:10/km</span>
								</div>
							</div>
						</div>
					</section>

					<!-- Contrast -->
					<section class="card lab-card">
						<div class="card-head">
							<h2 class="card-title">Contrast</h2>
							<span class="card-note" :class="{ bad: failing > 0 }">
								{{ failing ? `${failing} below AA` : 'All AA or better' }}
							</span>
						</div>
						<div class="contrast-list">
							<div v-for="row in contrastRows" :key="row.label" class="contrast-row">
								<span class="contrast-sample" :style="{ background: row.bg, color: row.fg }">Aa</span>
								<span class="contrast-label">{{ row.label }}</span>
								<span class="contrast-ratio mono">{{ row.ratio ?? '—' }}</span>
								<span class="contrast-verdict" :class="row.verdict?.toLowerCase().replace(' ', '-')">
									{{ row.verdict ?? '?' }}
								</span>
							</div>
						</div>
					</section>

					<section v-if="anyChanges && showCss" class="card lab-card">
						<div class="card-head"><h2 class="card-title">CSS</h2></div>
						<pre class="css-out">{{ css }}</pre>
					</section>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.lab-wrapper { width: 100%; min-height: 100%; }
.lab { padding: 24px 28px 40px; max-width: 1280px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .lab { padding: 16px 16px 32px; } }

.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.sub { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9rem; max-width: 62ch; line-height: 1.5; }
.head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.count-pill { font-size: 0.74rem; padding: 3px 10px; border-radius: 999px; background: var(--primary-soft); color: var(--primary-color); font-weight: 600; }

.action-button {
	background: var(--surface-2); border: 1px solid var(--border-color); color: var(--text-color);
	padding: 8px 14px; border-radius: var(--radius-sm); cursor: pointer;
	font-family: var(--font-family); font-size: 0.85rem; font-weight: 500;
	display: inline-flex; align-items: center; gap: 7px;
	transition: background 0.15s, border-color 0.15s;
}
.action-button:hover:not(:disabled) { background: var(--surface-hover); border-color: var(--border-strong); }
.action-button:disabled { opacity: 0.5; cursor: not-allowed; }
.action-button.primary { background: var(--primary-fill); border-color: var(--primary-fill); color: var(--on-primary); }
.action-button.primary:hover:not(:disabled) { background: var(--primary-fill-hover); border-color: var(--primary-fill-hover); }
.action-button.delete-button { border-color: var(--danger-soft); color: var(--danger-color); }
.action-button.delete-button:hover:not(:disabled) { background: var(--danger-color); border-color: var(--danger-color); color: #fff; }

.lab-card { padding: 16px 18px; margin-bottom: 14px; }
.card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.card-title { font-size: 1rem; font-weight: 600; }
.card-note { font-size: 0.74rem; color: var(--text-muted); }
.card-note.bad { color: var(--danger-color); }

/* Palette gallery */
.family-tabs { display: inline-flex; gap: 4px; background: var(--surface-2); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 2px; }
.family {
	background: none; border: none; color: var(--text-secondary);
	font-family: var(--font-family); font-size: 0.76rem; font-weight: 500;
	padding: 4px 11px; border-radius: calc(var(--radius-sm) - 2px); cursor: pointer;
}
.family:hover { color: var(--text-color); }
.family.on { background: var(--primary-fill); color: var(--on-primary); }

.palette-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(146px, 1fr)); gap: 10px; }
.palette {
	display: flex; flex-direction: column; gap: 6px; align-items: stretch;
	padding: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);
	background: var(--surface-2); cursor: pointer; text-align: left;
	font-family: var(--font-family); transition: border-color 0.15s, transform 0.12s;
}
.palette:hover { border-color: var(--border-strong); transform: translateY(-1px); }
.palette.on { border-color: var(--primary-color); box-shadow: 0 0 0 1px var(--primary-color); }

/* A miniature of the app: a page, a card on it, an accent bar, sport dots and
   two lines of text. Enough to tell two dark themes apart at a glance. */
.palette-tile { display: block; border-radius: 6px; padding: 9px; overflow: hidden; }
.palette-card { display: block; border-radius: 4px; border: 1px solid; padding: 7px; }
.palette-bar { display: block; height: 4px; width: 46%; border-radius: 2px; margin-bottom: 6px; }
.palette-dots { display: flex; gap: 4px; margin-bottom: 6px; }
.palette-dots i { display: block; width: 9px; height: 9px; border-radius: 50%; }
.palette-lines { display: flex; flex-direction: column; gap: 3px; }
.palette-lines i { display: block; height: 3px; border-radius: 2px; }
.palette-lines i:first-child { width: 80%; }
.palette-lines i:last-child { width: 55%; }

.palette-name { font-size: 0.82rem; font-weight: 600; color: var(--text-color); display: flex; align-items: center; gap: 5px; }
.palette-check { color: var(--primary-color); font-size: 0.9rem; }
.palette-blurb { font-size: 0.68rem; color: var(--text-muted); line-height: 1.35; }

.lab-columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; align-items: start; }
@media (max-width: 1000px) { .lab-columns { grid-template-columns: 1fr; } }
.lab-preview { position: sticky; top: 16px; }
@media (max-width: 1000px) { .lab-preview { position: static; } }

/* Style switches */
.switch + .switch { margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-subtle); }
.switch-head { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.switch-label { font-size: 0.84rem; font-weight: 600; color: var(--text-color); flex: 1; }
.switch-reset { background: none; border: none; cursor: pointer; padding: 0; display: flex; color: var(--text-muted); font-size: 0.9rem; }
.switch-reset:hover { color: var(--primary-color); }
.switch-blurb { margin: 7px 0 0; font-size: 0.73rem; color: var(--text-muted); line-height: 1.5; }
.switch-blurb.wide { margin: 0 0 14px; }

.segmented { display: flex; flex-wrap: wrap; gap: 4px; background: var(--surface-2); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 3px; }
.seg {
	flex: 1 1 auto; min-width: 0;
	background: none; border: none; color: var(--text-secondary);
	font-family: var(--font-family); font-size: 0.76rem; font-weight: 500;
	padding: 6px 8px; border-radius: calc(var(--radius-sm) - 3px); cursor: pointer;
	white-space: nowrap; transition: background 0.13s, color 0.13s;
}
.seg:hover { color: var(--text-color); background: var(--surface-hover); }
.seg.on { background: var(--primary-fill); color: var(--on-primary); }

/* Fine tuning */
.group-head { display: flex; align-items: center; gap: 9px; width: 100%; padding: 0; background: none; border: none; cursor: pointer; font-family: var(--font-family); font-size: 1rem; font-weight: 600; color: var(--text-color); text-align: left; }
.group-name { flex: 1; }
.group-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--primary-color); }
.group-caret { color: var(--text-muted); width: 12px; text-align: center; }
.group-body { margin-top: 14px; }
.subgroup + .subgroup { border-top: 1px solid var(--border-subtle); }
.subgroup-head { display: flex; width: 100%; justify-content: space-between; align-items: center; padding: 9px 0; background: none; border: none; cursor: pointer; font-family: var(--font-family); font-size: 0.82rem; font-weight: 500; color: var(--text-secondary); }
.subgroup-head:hover { color: var(--text-color); }
.subgroup-body { padding-bottom: 8px; }
.token { display: flex; align-items: center; gap: 9px; padding: 4px 0; }
.token-label { flex: 1; font-size: 0.79rem; color: var(--text-secondary); }
.token-value { font-size: 0.72rem; color: var(--text-muted); }
.swatch-input { width: 34px; height: 26px; padding: 0; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: none; cursor: pointer; flex-shrink: 0; }
.swatch-input::-webkit-color-swatch-wrapper { padding: 3px; }
.swatch-input::-webkit-color-swatch { border: none; border-radius: 3px; }

/* Specimen */
.spec-title { margin-bottom: 8px; }
.spec-body { margin: 0 0 6px; font-size: 0.92rem; line-height: 1.6; color: var(--text-color); }
.spec-secondary { margin: 0 0 4px; font-size: 0.84rem; color: var(--text-secondary); }
.spec-muted { margin: 0 0 14px; font-size: 0.78rem; color: var(--text-muted); }
.spec-row { display: flex; gap: 9px; flex-wrap: wrap; margin-bottom: 12px; align-items: center; }
.spec-field { background: var(--surface-2); border: 1px solid var(--border-color); color: var(--text-color); font-family: var(--font-family); font-size: 0.85rem; padding: 8px 11px; border-radius: var(--radius-sm); outline: none; }
.spec-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; font-weight: 600; padding: 3px 11px; border-radius: 999px; }
.verdict-good { background: var(--success-soft); color: var(--success-color); }
.verdict-warn { background: var(--warning-soft); color: var(--warning-color); }
.verdict-bad { background: var(--danger-soft); color: var(--danger-color); }
.spec-pill.pr { color: var(--pr-gold); border: 1px solid var(--pr-gold); }

.spec-sports { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.spec-sport { display: flex; align-items: center; gap: 12px; }
.spec-sport-chip { font-size: 0.7rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: var(--tag-soft); color: var(--tag-color); min-width: 68px; text-align: center; flex-shrink: 0; text-transform: capitalize; }
.spec-spark { flex: 1; min-width: 0; height: 24px; }

/* Borrowed wholesale from the calendar so the chip switches show their work. */
.spec-chips { display: flex; flex-direction: column; gap: 3px; margin-bottom: 12px; max-width: 260px; }
.chip { display: flex; align-items: center; gap: 4px; height: 19px; padding: 0 5px; border-radius: 4px; font-size: 0.68rem; line-height: 1; background: var(--surface-2); color: var(--text-color); border-left: 3px solid var(--tag-color); overflow: hidden; }
.chip-ico { font-size: 0.7rem; color: var(--tag-color); }
.chip-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.chip-meta { font-size: 0.62rem; color: var(--text-muted); }
.workout-running { --tag-color: var(--color-running-primary); }
.workout-gym { --tag-color: var(--color-gym-primary); }

.spec-wvcard { display: flex; gap: 12px; padding: 12px 14px; border: 1px solid var(--border-color); border-left: 3px solid var(--tag-color); border-radius: var(--radius-sm); background: var(--surface-color); }
.wv-badge { width: 34px; height: 34px; border-radius: 9px; background: var(--tag-color); color: var(--background-color); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
.wv-body { flex: 1; min-width: 0; }
.wv-name { font-weight: 600; font-size: 0.95rem; color: var(--text-color); }
.wv-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
.wv-pill { font-size: 0.74rem; font-weight: 500; color: var(--text-secondary); background: var(--surface-2); border: 1px solid var(--border-color); padding: 2px 9px; border-radius: 999px; }
.wv-pill-pace { color: var(--tag-color); border-color: color-mix(in srgb, var(--tag-color) 40%, transparent); background: color-mix(in srgb, var(--tag-color) 10%, transparent); font-family: var(--font-mono); }

/* Contrast */
.contrast-list { display: flex; flex-direction: column; }
.contrast-row { display: grid; grid-template-columns: 34px 1fr auto 62px; gap: 10px; align-items: center; padding: 6px 0; font-size: 0.8rem; }
.contrast-row + .contrast-row { border-top: 1px solid var(--border-subtle); }
.contrast-sample { display: flex; align-items: center; justify-content: center; height: 26px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; border: 1px solid var(--border-color); }
.contrast-label { color: var(--text-secondary); min-width: 0; }
.contrast-ratio { color: var(--text-muted); font-size: 0.76rem; }
.contrast-verdict { font-size: 0.66rem; font-weight: 700; text-align: center; padding: 2px 6px; border-radius: 999px; letter-spacing: 0.03em; background: var(--success-soft); color: var(--success-color); }
.contrast-verdict.aa-large { background: var(--warning-soft); color: var(--warning-color); }
.contrast-verdict.fail { background: var(--danger-soft); color: var(--danger-color); }

.css-out { margin: 0; padding: 12px 14px; border-radius: var(--radius-sm); background: var(--background-color); border: 1px solid var(--border-color); font-family: var(--font-mono); font-size: 0.72rem; line-height: 1.6; color: var(--text-secondary); overflow-x: auto; white-space: pre; }
</style>
