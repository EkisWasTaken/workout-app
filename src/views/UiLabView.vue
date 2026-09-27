<script setup lang="ts">
/**
 * The UI lab: tweak the design tokens and watch the app change under you.
 *
 * Deliberately not a sandbox. Overrides are written straight onto `<html>`, so
 * the specimen below, the sidebar beside you and every other page are all
 * already showing the change — you can set a colour here, walk to the schedule,
 * and judge it on real data. A preview pane rendering its own fake buttons
 * would only ever tell you about the preview pane.
 *
 * The specimen exists for the tokens you can't see from here: a sport colour,
 * a verdict, a chart line. It reuses the app's own classes rather than
 * restyling copies, so it can't drift away from the real thing.
 */
import { computed, ref } from 'vue'
import { NIcon, useMessage } from 'naive-ui'
import {
	ColorPaletteOutline, CopyOutline, RefreshOutline, ReloadOutline, CheckmarkCircle,
} from '@vicons/ionicons5'
import {
	TOKEN_GROUPS, applyPreset, contrast, currentValue, defaultValue, exportCss, fontsFor,
	grade, isOverridden, overrideCount, resetAll, resetToken, setToken, toHex,
	type TokenDef,
} from '@/uiLab'
import { PRESETS } from '@/uiLabPresets'

const message = useMessage()
const openGroup = ref<string>(TOKEN_GROUPS[0].key)
const showCss = ref(false)

const toggleGroup = (key: string) => { openGroup.value = openGroup.value === key ? '' : key }

// ─── editing ──────────────────────────────────────────────────────────────────

/** Sliders and colour inputs fire continuously; each change is applied live. */
function onColor(token: TokenDef, event: Event) {
	setToken(token.name, (event.target as HTMLInputElement).value)
}

function onLength(token: TokenDef, event: Event) {
	const raw = (event.target as HTMLInputElement).value
	setToken(token.name, token.unit === '%' ? raw : `${raw}${token.unit ?? 'px'}`)
}

function onFont(token: TokenDef, event: Event) {
	setToken(token.name, (event.target as HTMLSelectElement).value)
}

/** A length token's number, without its unit, for the slider. */
const numberOf = (token: TokenDef) => {
	const n = parseFloat(currentValue(token.name))
	return Number.isFinite(n) ? n : (token.min ?? 0)
}

const fontMatches = (token: TokenDef) => {
	const value = currentValue(token.name)
	const list = fontsFor(token.fonts ?? 'text')
	// A stack the list doesn't carry — hand-edited in app.css — still needs a
	// slot, or the select would silently snap it to something else.
	return list.some(f => f.stack === value) ? value : ''
}

// ─── contrast ─────────────────────────────────────────────────────────────────

/**
 * The palette's own promise is that every text colour clears AA on a card. A
 * colour picker makes that trivially easy to break, so it is checked here
 * rather than discovered later on a chart.
 */
const CONTRAST_PAIRS = [
	{ label: 'Primary text on card', fg: 'text-color', bg: 'surface-color' },
	{ label: 'Secondary text on card', fg: 'text-secondary', bg: 'surface-color' },
	{ label: 'Muted text on card', fg: 'text-muted', bg: 'surface-color' },
	{ label: 'Accent on card', fg: 'primary-color', bg: 'surface-color' },
	{ label: 'White on button fill', fg: '#ffffff', bg: 'primary-fill' },
	{ label: 'Better on card', fg: 'success-color', bg: 'surface-color' },
	{ label: 'Worse on card', fg: 'warning-color', bg: 'surface-color' },
	{ label: 'Problem on card', fg: 'danger-color', bg: 'surface-color' },
]

const resolve = (ref_: string) => (ref_.startsWith('#') ? ref_ : currentValue(ref_))

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

// ─── presets, reset, export ───────────────────────────────────────────────────

function usePreset(key: string) {
	const preset = PRESETS.find(p => p.key === key)
	if (!preset) return
	applyPreset(preset.values)
	message.success(`Applied “${preset.label}”.`)
}

function handleResetAll() {
	if (!overrideCount.value) return
	if (!window.confirm(`Discard ${overrideCount.value} change${overrideCount.value === 1 ? '' : 's'} and go back to the stock palette?`)) return
	resetAll()
	message.success('Back to stock.')
}

async function copyCss() {
	try {
		await navigator.clipboard.writeText(exportCss())
		message.success('CSS copied. Paste it into styles/app.css to make it the default.')
	} catch {
		showCss.value = true
		message.warning('Clipboard blocked — the CSS is shown below instead.')
	}
}

const css = computed(() => exportCss())

// ─── specimen data ────────────────────────────────────────────────────────────

const SPORTS = [
	{ key: 'running', label: 'Running' },
	{ key: 'gym', label: 'Gym' },
	{ key: 'bike', label: 'Bike' },
	{ key: 'rest', label: 'Rest' },
	{ key: 'other', label: 'Other' },
]

/** A believable sparkline, so the chart colours can be judged as lines. */
const sparkPath = (seed: number) => {
	let v = seed
	const pts = Array.from({ length: 24 }, (_, i) => {
		v = (v * 16807) % 2147483647
		return [i * (220 / 23), 46 - ((v / 2147483647) * 0.6 + 0.2) * 44] as const
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
						Every change applies to the whole app straight away and is remembered on this device.
						Walk to another page to judge it on real data, then come back.
					</p>
				</div>
				<div class="head-actions">
					<span v-if="overrideCount" class="count-pill">{{ overrideCount }} changed</span>
					<button class="action-button" :disabled="!overrideCount" @click="copyCss">
						<n-icon :component="CopyOutline" /> Copy CSS
					</button>
					<button class="action-button" :disabled="!overrideCount" @click="handleResetAll">
						<n-icon :component="ReloadOutline" /> Reset all
					</button>
				</div>
			</header>

			<!-- Presets -->
			<section class="card lab-card">
				<div class="card-head">
					<h2 class="card-title"><n-icon :component="ColorPaletteOutline" /> Start from</h2>
					<span class="card-note">A whole palette at once. You can tweak anything afterwards.</span>
				</div>
				<div class="preset-row">
					<button class="preset" @click="resetAll">
						<span class="preset-swatches">
							<i style="background: #12151b"></i><i style="background: #9b8cff"></i>
							<i style="background: #38bdf8"></i><i style="background: #f472b6"></i>
						</span>
						<span class="preset-name">Stock</span>
					</button>
					<button v-for="p in PRESETS" :key="p.key" class="preset" @click="usePreset(p.key)">
						<span class="preset-swatches">
							<i v-for="(c, i) in p.swatches" :key="i" :style="{ background: c }"></i>
						</span>
						<span class="preset-name">{{ p.label }}</span>
						<span class="preset-blurb">{{ p.blurb }}</span>
					</button>
				</div>
			</section>

			<div class="lab-columns">
				<!-- Controls -->
				<div class="lab-controls">
					<section v-for="group in TOKEN_GROUPS" :key="group.key" class="card lab-card group">
						<button class="group-head" @click="toggleGroup(group.key)">
							<span class="group-name">{{ group.label }}</span>
							<span v-if="group.tokens.some(t => isOverridden(t.name))" class="group-dot" title="Changed"></span>
							<span class="group-caret">{{ openGroup === group.key ? '−' : '+' }}</span>
						</button>
						<div v-if="openGroup === group.key" class="group-body">
							<p class="group-blurb">{{ group.blurb }}</p>

							<div v-for="token in group.tokens" :key="token.name" class="token">
								<div class="token-head">
									<label :for="`t-${token.name}`" class="token-label">{{ token.label }}</label>
									<button v-if="isOverridden(token.name)" class="token-reset"
										:title="`Back to ${defaultValue(token.name)}`" @click="resetToken(token.name)">
										<n-icon :component="RefreshOutline" />
									</button>
								</div>

								<!-- Colour -->
								<div v-if="token.kind === 'color'" class="token-control">
									<input
										:id="`t-${token.name}`"
										type="color"
										class="swatch-input"
										:value="toHex(currentValue(token.name))"
										@input="onColor(token, $event)"
									/>
									<input
										type="text"
										class="value-input mono"
										:value="currentValue(token.name)"
										spellcheck="false"
										@change="onColor(token, $event)"
									/>
								</div>

								<!-- Length / number -->
								<div v-else-if="token.kind === 'length' || token.kind === 'number'" class="token-control">
									<input
										:id="`t-${token.name}`"
										type="range"
										class="range-input"
										:min="token.min" :max="token.max" :step="token.step"
										:value="numberOf(token)"
										@input="onLength(token, $event)"
									/>
									<span class="value-readout mono">{{ numberOf(token) }}{{ token.unit }}</span>
								</div>

								<!-- Font -->
								<div v-else-if="token.kind === 'font'" class="token-control">
									<select :id="`t-${token.name}`" class="value-input" :value="fontMatches(token)"
										@change="onFont(token, $event)">
										<option v-if="!fontMatches(token)" value="">Custom (from app.css)</option>
										<option v-for="f in fontsFor(token.fonts ?? 'text')" :key="f.label" :value="f.stack">
											{{ f.label }}
										</option>
									</select>
								</div>

								<p v-if="token.hint" class="token-hint">{{ token.hint }}</p>
							</div>
						</div>
					</section>
				</div>

				<!-- Specimen -->
				<div class="lab-preview">
					<section class="card lab-card">
						<div class="card-head">
							<h2 class="card-title">Specimen</h2>
							<span class="card-note">The real classes, not copies.</span>
						</div>

						<h1 class="page-title spec-title">Good evening, Elias</h1>
						<p class="spec-body">
							Body text at its normal size, with a <a href="#/ui-lab">link</a> in it and a
							<strong>bold run</strong>. This is the size most of the app reads at.
						</p>
						<p class="spec-secondary">Secondary text — labels, captions and the notes under a chart.</p>
						<p class="spec-muted">Muted text — asides you can skip.</p>

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
							<div v-for="s in SPORTS" :key="s.key" class="spec-sport" :style="{
								'--tag-color': `var(--color-${s.key}-primary)`,
								'--tag-soft': `var(--color-${s.key}-soft)`,
							}">
								<span class="spec-sport-chip">{{ s.label }}</span>
								<svg viewBox="0 0 220 50" class="spec-spark" preserveAspectRatio="none">
									<path :d="sparkPath(s.key.length * 977 + 13)" fill="none"
										:stroke="`var(--color-${s.key}-primary)`" stroke-width="2"
										stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</div>
						</div>

						<div class="spec-card">
							<div class="spec-card-head">
								<span class="spec-badge"><n-icon :component="CheckmarkCircle" /></span>
								<div>
									<span class="spec-card-name">Threshold 5×1k</span>
									<span class="spec-card-sub">Running · Tuesday, 29 September</span>
								</div>
							</div>
							<div class="spec-stats">
								<div><span class="spec-num mono">12.0</span><span class="spec-lbl">km</span></div>
								<div><span class="spec-num mono">4:13</span><span class="spec-lbl">/km</span></div>
								<div><span class="spec-num mono">168</span><span class="spec-lbl">bpm</span></div>
							</div>
						</div>

						<div class="spec-streams">
							<span v-for="s in ['heartrate', 'cadence', 'elevation']" :key="s" class="spec-stream">
								<i :style="{ background: `var(--color-${s})` }"></i>{{ s }}
							</span>
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
						<p class="group-blurb">
							The stock palette clears WCAG AA for body text everywhere. A colour picker makes that
							easy to lose by accident, so it is checked here rather than found later on a chart.
						</p>
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

					<!-- Export -->
					<section v-if="overrideCount" class="card lab-card">
						<div class="card-head">
							<h2 class="card-title">Make it permanent</h2>
							<button class="link-btn" @click="showCss = !showCss">{{ showCss ? 'Hide' : 'Show' }} CSS</button>
						</div>
						<p class="group-blurb">
							Changes live in this browser only. Paste this into <code>src/styles/app.css</code>,
							replacing the matching lines in <code>:root</code>, to make them the app's defaults for
							everyone — then reset here so you're seeing the real thing.
						</p>
						<pre v-if="showCss" class="css-out">{{ css }}</pre>
					</section>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.lab-wrapper { width: 100%; min-height: 100%; }
.lab { padding: 24px 28px 40px; max-width: 1240px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .lab { padding: 16px 16px 32px; } }

.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.sub { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9rem; max-width: 62ch; line-height: 1.5; }
.head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.count-pill {
	font-size: 0.74rem; padding: 3px 10px; border-radius: 999px;
	background: var(--primary-soft); color: var(--primary-color); font-weight: 600;
}

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
.action-button.primary:hover { background: var(--primary-fill-hover); border-color: var(--primary-fill-hover); }
.action-button.delete-button { border-color: var(--danger-soft); color: var(--danger-color); }
.action-button.delete-button:hover { background: var(--danger-color); border-color: var(--danger-color); color: #fff; }

.lab-card { padding: 16px 18px; margin-bottom: 14px; }
.card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.card-title { font-size: 1rem; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; }
.card-note { font-size: 0.74rem; color: var(--text-muted); }
.card-note.bad { color: var(--danger-color); }
.link-btn { background: none; border: none; color: var(--primary-color); font: inherit; font-size: 0.78rem; cursor: pointer; padding: 0; }

/* Presets */
.preset-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
.preset {
	display: flex; flex-direction: column; gap: 6px; align-items: flex-start;
	padding: 11px 13px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);
	background: var(--surface-2); cursor: pointer; text-align: left;
	font-family: var(--font-family); transition: border-color 0.15s, background 0.15s;
}
.preset:hover { border-color: var(--primary-color); background: var(--surface-hover); }
.preset-swatches { display: inline-flex; border-radius: 4px; overflow: hidden; }
.preset-swatches i { display: block; width: 22px; height: 14px; }
.preset-name { font-size: 0.85rem; font-weight: 600; color: var(--text-color); }
.preset-blurb { font-size: 0.7rem; color: var(--text-muted); line-height: 1.4; }

/* Two columns: controls scroll, the specimen stays where you can see it. */
.lab-columns { display: grid; grid-template-columns: minmax(0, 360px) minmax(0, 1fr); gap: 14px; align-items: start; }
@media (max-width: 960px) { .lab-columns { grid-template-columns: 1fr; } }
.lab-preview { position: sticky; top: 16px; }
@media (max-width: 960px) { .lab-preview { position: static; } }

/* Groups */
.group { padding: 0; }
.group-head {
	display: flex; align-items: center; gap: 9px; width: 100%;
	padding: 13px 18px; background: none; border: none; cursor: pointer;
	font-family: var(--font-family); font-size: 0.9rem; font-weight: 600; color: var(--text-color);
	text-align: left;
}
.group-head:hover { background: var(--surface-hover); }
.group-name { flex: 1; }
.group-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--primary-color); flex-shrink: 0; }
.group-caret { color: var(--text-muted); width: 12px; text-align: center; }
.group-body { padding: 0 18px 16px; border-top: 1px solid var(--border-color); }
.group-blurb { margin: 12px 0 14px; font-size: 0.78rem; color: var(--text-muted); line-height: 1.55; }

/* Tokens */
.token + .token { margin-top: 13px; padding-top: 13px; border-top: 1px solid var(--border-subtle); }
.token-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.token-label { font-size: 0.82rem; color: var(--text-secondary); font-weight: 500; flex: 1; }
.token-reset {
	background: none; border: none; cursor: pointer; padding: 0; display: flex;
	color: var(--text-muted); font-size: 0.9rem;
}
.token-reset:hover { color: var(--primary-color); }
.token-control { display: flex; align-items: center; gap: 9px; }
.token-hint { margin: 6px 0 0; font-size: 0.72rem; color: var(--text-muted); line-height: 1.45; }

.swatch-input {
	width: 40px; height: 32px; padding: 0; border: 1px solid var(--border-color);
	border-radius: var(--radius-sm); background: none; cursor: pointer; flex-shrink: 0;
}
.swatch-input::-webkit-color-swatch-wrapper { padding: 3px; }
.swatch-input::-webkit-color-swatch { border: none; border-radius: 4px; }

.value-input {
	flex: 1; min-width: 0; background: var(--surface-2); border: 1px solid var(--border-color);
	color: var(--text-color); font-family: var(--font-family); font-size: 0.8rem;
	padding: 7px 10px; border-radius: var(--radius-sm); outline: none;
}
.value-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-soft); }
.value-input.mono { font-family: var(--font-mono); }

.range-input { flex: 1; min-width: 0; accent-color: var(--primary-color); }
.value-readout { font-size: 0.78rem; color: var(--text-secondary); min-width: 5ch; text-align: right; }

/* Specimen */
.spec-title { margin-bottom: 8px; }
.spec-body { margin: 0 0 6px; font-size: 0.92rem; line-height: 1.6; color: var(--text-color); }
.spec-secondary { margin: 0 0 4px; font-size: 0.84rem; color: var(--text-secondary); }
.spec-muted { margin: 0 0 14px; font-size: 0.78rem; color: var(--text-muted); }
.spec-row { display: flex; gap: 9px; flex-wrap: wrap; margin-bottom: 12px; align-items: center; }
.spec-field {
	background: var(--surface-2); border: 1px solid var(--border-color); color: var(--text-color);
	font-family: var(--font-family); font-size: 0.85rem; padding: 8px 11px;
	border-radius: var(--radius-sm); outline: none;
}
.spec-pill {
	display: inline-flex; align-items: center; gap: 5px;
	font-size: 0.75rem; font-weight: 600; padding: 3px 11px; border-radius: 999px;
}
.verdict-good { background: var(--success-soft); color: var(--success-color); }
.verdict-warn { background: var(--warning-soft); color: var(--warning-color); }
.verdict-bad { background: var(--danger-soft); color: var(--danger-color); }
.spec-pill.pr { color: var(--pr-gold); border: 1px solid var(--pr-gold); }

.spec-sports { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.spec-sport { display: flex; align-items: center; gap: 12px; }
.spec-sport-chip {
	font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 999px;
	background: var(--tag-soft); color: var(--tag-color); min-width: 72px; text-align: center; flex-shrink: 0;
}
.spec-spark { flex: 1; min-width: 0; height: 26px; }

.spec-card {
	border: 1px solid var(--border-color); border-radius: var(--radius);
	background: var(--surface-2); overflow: hidden; margin-bottom: 12px;
}
.spec-card-head {
	display: flex; align-items: center; gap: 11px; padding: 12px 14px;
	background: var(--color-running-soft); border-bottom: 1px solid var(--border-color);
}
.spec-badge {
	width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
	background: var(--color-running-primary); color: var(--on-primary);
	display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
}
.spec-card-name { display: block; font-weight: 600; font-size: 0.92rem; color: var(--text-color); }
.spec-card-sub { display: block; font-size: 0.74rem; color: var(--text-secondary); }
.spec-stats { display: flex; gap: 22px; padding: 12px 14px; }
.spec-num { font-family: var(--font-mono); font-size: 1.3rem; font-weight: 700; color: var(--text-color); }
.spec-lbl { font-size: 0.7rem; color: var(--text-muted); margin-left: 4px; }

.spec-streams { display: flex; gap: 14px; flex-wrap: wrap; }
.spec-stream { display: inline-flex; align-items: center; gap: 6px; font-size: 0.74rem; color: var(--text-secondary); }
.spec-stream i { width: 14px; height: 3px; border-radius: 2px; display: inline-block; }

/* Contrast */
.contrast-list { display: flex; flex-direction: column; }
.contrast-row {
	display: grid; grid-template-columns: 34px 1fr auto 62px;
	gap: 10px; align-items: center; padding: 6px 0; font-size: 0.8rem;
}
.contrast-row + .contrast-row { border-top: 1px solid var(--border-subtle); }
.contrast-sample {
	display: flex; align-items: center; justify-content: center;
	height: 26px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600;
	border: 1px solid var(--border-color);
}
.contrast-label { color: var(--text-secondary); min-width: 0; }
.contrast-ratio { color: var(--text-muted); font-size: 0.76rem; }
.contrast-verdict {
	font-size: 0.66rem; font-weight: 700; text-align: center;
	padding: 2px 6px; border-radius: 999px; letter-spacing: 0.03em;
	background: var(--success-soft); color: var(--success-color);
}
.contrast-verdict.aa-large { background: var(--warning-soft); color: var(--warning-color); }
.contrast-verdict.fail { background: var(--danger-soft); color: var(--danger-color); }

.css-out {
	margin: 10px 0 0; padding: 12px 14px; border-radius: var(--radius-sm);
	background: var(--background-color); border: 1px solid var(--border-color);
	font-family: var(--font-mono); font-size: 0.74rem; line-height: 1.65;
	color: var(--text-secondary); overflow-x: auto; white-space: pre;
}
code { font-family: var(--font-mono); font-size: 0.92em; color: var(--text-secondary); }
</style>
