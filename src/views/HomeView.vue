<template>
	<div class="home-view">
		<!-- Header -->
		<header class="home-header">
			<div>
				<h1 class="greeting">{{ greeting }}<span v-if="userName">, {{ userName }}</span></h1>
				<p class="subgreeting">{{ todayLabel }}</p>
			</div>
			<div class="header-actions">
				<span v-if="weekStreak > 0" class="streak-badge">
					<n-icon class="flame" :component="FlameOutline" /> {{ weekStreak }}-week streak
				</span>
				<router-link to="/schedule" class="primary-btn">
					<n-icon :component="AddOutline" /> Plan workout
				</router-link>
			</div>
		</header>

		<!-- Tabs: only the active group's canvases mount, so only its charts build -->
		<nav class="tabbar">
			<button v-for="t in TABS" :key="t.key" :class="{ active: tab === t.key }" @click="tab = t.key">
				{{ t.label }}
			</button>
		</nav>

		<template v-if="tab === 'today'">
		<!-- Today's session -->
		<section class="panel today-card rise">
			<div class="today-head">
				<h2>Today</h2>
				<span v-if="todayAllDone" class="today-status done">All done ✓</span>
				<span v-else-if="todayIsRest" class="today-status rest">Rest day</span>
			</div>

			<p v-if="todayIsRest" class="today-rest-note">Nothing scheduled. Recovery is training.</p>

			<div v-else class="today-sessions">
				<div v-for="w in todaysWorkouts" :key="w.id" class="today-session" :class="{ done: w.isCompleted === 1 }">
					<span class="ts-dot" :style="{ background: sportColor(w) }"></span>
					<div class="ts-body">
						<div class="ts-top">
							<router-link :to="`/workout/${w.id}`" class="ts-name">{{ w.name }}</router-link>
							<span v-if="w.isCompleted === 1" class="ts-done">✓</span>
						</div>
						<div class="ts-pills">
							<span v-if="workoutKm(w)" class="ts-pill">{{ fmt(workoutKm(w)!) }} km</span>
							<span v-if="w.duration" class="ts-pill">{{ w.duration }} min</span>
							<span v-if="todayPace(w)" class="ts-pill pace mono"
								:class="'basis-' + todayPace(w)!.basis" :title="todayPace(w)!.explain">
								{{ todayPace(w)!.zone }} · {{ todayPace(w)!.value
								}}<template v-if="todayPace(w)!.basis !== 'planned'">/km</template>
							</span>
							<span v-if="w.gymType" class="ts-pill">{{ w.gymType }}</span>
						</div>
						<ul v-if="sessionSteps(w).length" class="ts-steps">
							<li v-for="(step, i) in sessionSteps(w)" :key="i">{{ step }}</li>
						</ul>
					</div>
					<button v-if="w.isCompleted !== 1" class="ts-complete" :disabled="completingId !== null"
						@click="completeToday(w)">
						{{ completingId === w.id ? 'Saving…' : 'Complete' }}
					</button>
				</div>
			</div>
		</section>

		<!-- Race hero -->
		<section v-if="nextRace" class="hero rise" :class="{ urgent: nextRaceDays !== null && nextRaceDays <= 14 }">
			<div class="hero-main">
				<div class="hero-left">
					<span class="hero-kicker"><n-icon :component="FlagOutline" /> Next race</span>
					<h2 class="hero-race">{{ nextRace.name }}</h2>
					<p class="hero-sub">{{ formatRaceDate(nextRace.date) }}<span v-if="planProgress"> · week {{ planProgress.current }} of {{ planProgress.total }}</span></p>
					<div class="hero-chips">
						<span v-if="predictedCurrent !== null" class="hero-chip"><span class="hc-lbl">Predicted</span><span class="mono">{{ fmtTime(predictedCurrent) }}</span></span>
						<span v-if="goalRaceSecs !== null" class="hero-chip"><span class="hc-lbl">Goal</span><span class="mono">{{ fmtTime(goalRaceSecs) }}</span></span>
						<span v-if="predictedDelta !== null" class="hero-chip" :class="predictedDelta <= 0 ? 'good' : 'warn'">
							{{ predictedDelta <= 0 ? '▲ ' + fmtTime(Math.abs(predictedDelta)) + ' ahead of goal' : '▼ ' + fmtTime(predictedDelta) + ' to shave' }}
						</span>
					</div>
				</div>
				<div class="hero-count">
					<span class="hero-days mono">{{ nextRaceDays }}</span>
					<span class="hero-days-lbl">days to go</span>
					<span class="hero-weeks">{{ Math.ceil((nextRaceDays || 0) / 7) }} weeks</span>
				</div>
			</div>
			<div v-if="planProgress" class="hero-bar">
				<div class="hb-track">
					<div v-for="(w, i) in planProgress.weeks" :key="i" class="hb-seg"
						:class="{ done: w.done, cur: w.current, taper: w.taper }"></div>
				</div>
				<div class="hb-labels"><span>plan start</span><span class="hb-taper">taper</span><span>race day</span></div>
			</div>
		</section>

		<!-- Fresh PRs this week -->
		<div v-if="recentPRs.length" class="pr-banner rise">
			<span class="pr-banner-ico"><n-icon :component="TrophyOutline" /></span>
			<span v-for="p in recentPRs" :key="p" class="pr-banner-chip">{{ p }}</span>
		</div>

		<!-- This-week metric cards -->
		<section class="metric-grid">
			<div class="metric-card">
				<div class="metric-top"><span class="metric-label">Distance this week</span><n-icon class="metric-ico run" :component="WalkOutline" /></div>
				<div class="metric-value mono">{{ fmt(thisWeekDistance) }}<span class="unit"> km</span></div>
				<div class="metric-sub" :class="distDelta >= 0 ? 'up' : 'down'">
					{{ distDelta >= 0 ? '▲' : '▼' }} {{ fmt(Math.abs(distDelta)) }} km vs last week
				</div>
				<div class="spark">
					<div v-for="(h, i) in distSpark" :key="i" class="spark-bar"
						:class="{ last: i === distSpark.length - 1 }" :style="{ height: Math.max(6, h) + '%' }"></div>
				</div>
			</div>

			<div v-if="aerobicPace" class="metric-card">
				<div class="metric-top"><span class="metric-label">Aerobic pace</span><n-icon class="metric-ico run" :component="WalkOutline" /></div>
				<div class="metric-value mono good">{{ fmtTime(Math.round(aerobicPace.paceSec)) }}<span class="unit"> /km</span></div>
				<div v-if="aerobicPace.delta !== null" class="metric-sub" :class="aerobicPace.delta <= 0 ? 'up' : 'down'">
					{{ aerobicPace.delta <= 0 ? '▲' : '▼' }} {{ Math.abs(Math.round(aerobicPace.delta)) }} s/km vs last month
				</div>
				<div class="metric-sub muted">easy runs · {{ aerobicPace.hrLabel }}</div>
			</div>

			<div class="metric-card">
				<div class="metric-top"><span class="metric-label">Sessions</span><n-icon class="metric-ico" :component="CheckmarkDoneOutline" /></div>
				<div class="metric-value mono">{{ sessionsDone }}<span class="unit"> / {{ sessionsPlanned }}</span></div>
				<div class="metric-sub muted">{{ sessionsPct }}% of the week done</div>
				<div class="progress-track"><div class="progress-fill" :style="{ width: sessionsPct + '%' }"></div></div>
			</div>

			<div class="metric-card">
				<div class="metric-top"><span class="metric-label">Load lifted</span><n-icon class="metric-ico gym" :component="BarbellOutline" /></div>
				<div class="metric-value mono">{{ fmt(thisWeekTonnage) }}<span class="unit"> t</span></div>
				<div class="metric-sub muted">{{ gymSessionsThisWeek }} gym session{{ gymSessionsThisWeek === 1 ? '' : 's' }}</div>
				<div class="spark">
					<div v-for="(h, i) in tonSpark" :key="i" class="spark-bar gym"
						:class="{ last: i === tonSpark.length - 1 }" :style="{ height: Math.max(6, h) + '%' }"></div>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-top"><span class="metric-label">Body weight</span><n-icon class="metric-ico" :component="BodyOutline" /></div>
				<div class="metric-value mono">{{ latestWeight ? fmt(latestWeight) : '—' }}<span v-if="latestWeight" class="unit"> kg</span></div>
				<div v-if="weightDelta !== null" class="metric-sub" :class="weightDelta <= 0 ? 'up' : 'muted'">
					{{ weightDelta <= 0 ? '▼' : '▲' }} {{ fmt(Math.abs(weightDelta)) }} kg vs 4 weeks ago
				</div>
				<div v-if="latestWeight && goalWeight" class="metric-sub muted">
					{{ weightToGoal === 0 ? 'at goal' : fmt(Math.abs(weightToGoal)) + ' kg to goal' }}
				</div>
				<div v-else class="metric-sub muted">no goal set</div>
			</div>
		</section>

		<!-- This week -->
		<section class="panel week-panel">
			<div class="panel-head">
				<h2>This week</h2>
				<router-link to="/schedule" class="text-link">Open schedule →</router-link>
			</div>
			<div class="week-strip">
				<router-link v-for="day in weekDays" :key="day.key" to="/schedule" class="day-col" :class="{ today: day.isToday }">
					<span class="day-name">{{ day.name }}</span>
					<div class="day-box">
						<template v-if="day.workouts.length">
							<span v-for="w in day.workouts" :key="w.id" class="day-chip" :class="{ done: w.isCompleted === 1 }"
								:style="{ '--c': sportColor(w) }" :title="w.name">{{ chipLabel(w) }}<span v-if="w.isCompleted === 1"> ✓</span></span>
						</template>
						<span v-else class="day-empty">·</span>
					</div>
				</router-link>
			</div>
			<div v-if="!nextRace" class="race-empty" style="margin-top: 12px;">
				<router-link to="/profile" class="text-link">Add a race goal →</router-link>
			</div>
		</section>
		</template>

		<template v-if="tab === 'goals'">
		<!-- Goal tracker: needed VDOT vs current, and whether the trend gets there in time -->
		<template v-if="currentFitness">
			<div class="section-head">
				<h2>Goal tracker</h2>
				<span class="section-note">
					current VDOT {{ currentFitness.vdot }} · {{ fitnessSourceLabel }}
				</span>
			</div>

			<section v-if="trackedTargets.length" class="goal-grid">
				<div v-for="t in trackedTargets" :key="t.key" class="panel goal-card"
					:class="{ aspirational: t.date === null, reached: t.progress.gap <= 0 }">
					<div class="gc-head">
						<span class="gc-name">{{ t.name }}</span>
						<span v-if="t.date === null" class="gc-when muted">someday</span>
						<span v-else-if="t.progress.daysOut !== null && t.progress.daysOut >= 0" class="gc-when">
							{{ t.progress.daysOut }} days
						</span>
						<span v-else class="gc-when muted">past</span>
					</div>

					<div class="gc-target mono">{{ fmtTime(t.goalTimeSecs) }}</div>

					<div class="gc-bar">
						<div class="gc-bar-fill" :style="{ width: goalBarPct(t) + '%' }"></div>
						<div class="gc-bar-goal"></div>
					</div>
					<div class="gc-vdots">
						<span>you {{ t.progress.currentVdot }}</span>
						<span>needs {{ t.neededVdot }}</span>
					</div>

					<p v-if="t.progress.gap <= 0" class="gc-verdict good">
						Already there — {{ Math.abs(t.progress.gap) }} VDOT to spare.
					</p>
					<p v-else-if="t.progress.onTrack === true" class="gc-verdict good">
						On track. Trend projects VDOT {{ t.progress.projectedVdot }} by then.
					</p>
					<p v-else-if="t.progress.onTrack === false" class="gc-verdict off">
						Behind. Trend arrives at {{ t.progress.projectedVdot }} —
						{{ t.progress.projectedShortfall }} VDOT short.
					</p>
					<p v-else class="gc-verdict muted">
						Needs {{ t.progress.gap }} more VDOT.
						<template v-if="t.progress.noProjectionReason === 'undated'">Give it a date to track a trend.</template>
						<template v-else-if="t.progress.noProjectionReason === 'too-far'">Too far out to project — check back within six months.</template>
						<template v-else-if="t.progress.noProjectionReason === 'past'">That date has passed.</template>
						<template v-else>Not enough VDOT history to project a trend yet.</template>
					</p>
				</div>
			</section>

			<section v-else class="panel form-calibrating">
				<p>No goals set yet. <router-link to="/profile" class="text-link">Add a goal time →</router-link></p>
			</section>

			<p class="vo2-note goal-foot">
				<span v-if="vdotTrend !== null">
					Trend: {{ vdotTrend > 0 ? '+' : '' }}{{ vdotTrend }} VDOT per month over the last 12 weeks.
				</span>
				<span v-else>Not enough VDOT history to measure a trend yet.</span>
				<span v-if="currentFitness.stale" class="warn-note">
					Your newest reading is from {{ currentFitness.date }} — it may be out of date.
				</span>
			</p>
		</template>

		<!-- Fitness trend: VDOT from every hard effort and race, against the goals -->
		<template v-if="vdotTrendHasData">
			<div class="section-head">
				<h2>Fitness trend</h2>
				<span class="section-note">VDOT from your races and hard efforts</span>
			</div>
			<section class="panel chart-card vdot-card">
				<div class="chart-head">
					<h3>VDOT over time</h3>
					<div class="form-badges">
						<span v-if="currentFitness" class="fb">
							<span class="fb-lbl">Now</span><span class="mono">{{ currentFitness.vdot }}</span>
						</span>
						<span v-if="vdotTrend !== null" class="fb">
							<span class="fb-lbl">Trend</span>
							<span class="mono">{{ vdotTrend > 0 ? '+' : '' }}{{ vdotTrend }}/mo</span>
						</span>
						<span v-if="currentFitness?.stale" class="fb-verdict warn">Ageing reading</span>
					</div>
				</div>
				<div class="chart-body"><canvas ref="vdotCanvas"></canvas></div>
				<div class="form-foot">
					<p class="vo2-note">
						Each dot is one run: the best VDOT it implies. Races are ringed. The solid line is
						your best effort in the trailing 90 days — the number your paces come from. Dashed
						lines are the VDOT each goal needs.
					</p>
					<p v-if="vdotTrend === null" class="vo2-note">
						No trend yet: one effort still tops every 90-day window. Run something hard and the
						line will move.
					</p>
					<p v-if="currentFitness?.stale" class="vo2-note warn-note">
						Your best reading is from {{ currentFitness.date }} — race or time-trial to refresh it.
					</p>
				</div>
			</section>
		</template>

		<!-- Plan progress -->
		<template v-if="planHasData">
			<div class="section-head"><h2>Plan progress</h2><span class="section-note">planned vs completed</span></div>
			<section class="plan-grid">
				<div class="panel plan-ring-card">
					<div class="ring-wrap">
						<svg viewBox="0 0 120 120" class="ring">
							<circle class="ring-bg" cx="60" cy="60" r="52" fill="none" stroke-width="12" />
							<circle class="ring-fg" cx="60" cy="60" r="52" fill="none" stroke-width="12"
								:stroke-dasharray="planRingDash" stroke-linecap="round" transform="rotate(-90 60 60)" />
						</svg>
						<div class="ring-center">
							<span class="ring-pct mono">{{ planRingPct }}%</span>
							<span class="ring-lbl">on plan</span>
						</div>
					</div>
					<div class="plan-ring-foot">This week · {{ thisWeekPlan.done }} of {{ thisWeekPlan.planned }} sessions</div>
				</div>

				<div class="panel plan-stats-card">
					<div class="plan-stat-row">
						<div class="plan-stat">
							<span class="ps-label">Sessions done</span>
							<span class="ps-val mono">{{ thisWeekPlan.done }}<span class="ps-of">/ {{ thisWeekPlan.planned }}</span></span>
							<div class="progress-track"><div class="progress-fill" :style="{ width: (thisWeekPlan.planned ? Math.min(100, thisWeekPlan.done / thisWeekPlan.planned * 100) : 0) + '%' }"></div></div>
						</div>
						<div class="plan-stat">
							<span class="ps-label">Distance done</span>
							<span class="ps-val mono">{{ thisWeekPlan.doneKm }}<span class="ps-of">/ {{ thisWeekPlan.plannedKm }} km</span></span>
							<div class="progress-track"><div class="progress-fill run" :style="{ width: (thisWeekPlan.plannedKm ? Math.min(100, thisWeekPlan.doneKm / thisWeekPlan.plannedKm * 100) : 0) + '%' }"></div></div>
						</div>
					</div>
					<div class="plan-history">
						<span class="ph-title">Weekly consistency · last 8 weeks</span>
						<div class="ph-bars">
							<div v-for="(w, i) in planWeeks" :key="i" class="ph-col" :title="`${w.label}: ${w.done}/${w.planned} sessions`">
								<div class="ph-bar-track">
									<div class="ph-bar-fill" :class="{ full: (w.pct ?? 0) >= 100 }" :style="{ height: (w.pct ?? 0) + '%' }"></div>
								</div>
								<span class="ph-x">{{ w.label }}</span>
							</div>
						</div>
					</div>
				</div>
			</section>
		</template>

		<!-- Projections -->
		<template v-if="weightPrediction || runningPrediction">
			<div class="section-head"><h2>Projections</h2><span class="section-note">based on recent trends</span></div>
			<section class="pred-grid">
				<div v-if="runningPrediction" class="pred-card panel">
					<div class="pred-icon run"><n-icon :component="WalkOutline" /></div>
					<div class="pred-body">
						<div class="pred-label">Running volume</div>
						<div class="pred-main">
							<span class="mono">{{ fmt(runningPrediction.proj4w) }}<span class="unit"> km</span></span>
							<span class="pred-timeframe">in 4 weeks</span>
						</div>
						<div class="pred-trend" :class="runningPrediction.slopePerWeek >= 0 ? 'pos' : 'neg'">
							{{ runningPrediction.slopePerWeek >= 0 ? '↑' : '↓' }}
							{{ fmt(Math.abs(runningPrediction.slopePerWeek)) }} km/week
							· avg {{ fmt(runningPrediction.currentAvg) }} km
						</div>
					</div>
				</div>
				<div v-if="weightPrediction && goalWeight" class="pred-card panel">
					<div class="pred-icon"><n-icon :component="BodyOutline" /></div>
					<div class="pred-body">
						<div class="pred-label">Weight projection</div>
						<div class="pred-main">
							<span class="mono">{{ fmt(weightPrediction.proj4w) }}<span class="unit"> kg</span></span>
							<span class="pred-timeframe">in 4 weeks</span>
						</div>
						<div v-if="weightPrediction.weeksToGoal !== null && weightPrediction.weeksToGoal > 0" class="pred-trend">
							Goal est. in {{ weightPrediction.weeksToGoal }} week{{ weightPrediction.weeksToGoal === 1 ? '' : 's' }}
						</div>
						<div v-else-if="weightPrediction.weeksToGoal !== null && weightPrediction.weeksToGoal <= 0" class="pred-trend pos">
							At or past goal ✓
						</div>
						<div v-else class="pred-trend muted">Set a goal to project</div>
					</div>
				</div>
				<div v-if="weightPrediction && !goalWeight" class="pred-card panel">
					<div class="pred-icon"><n-icon :component="BodyOutline" /></div>
					<div class="pred-body">
						<div class="pred-label">Weight projection</div>
						<div class="pred-main">
							<span class="mono">{{ fmt(weightPrediction.proj4w) }}<span class="unit"> kg</span></span>
							<span class="pred-timeframe">in 4 weeks</span>
						</div>
						<div class="pred-trend" :class="weightPrediction.slopePerWeek < 0 ? 'pos' : weightPrediction.slopePerWeek > 0 ? 'neg' : 'muted'">
							{{ weightPrediction.slopePerWeek > 0 ? '↑' : weightPrediction.slopePerWeek < 0 ? '↓' : '→' }}
							{{ fmt(Math.abs(weightPrediction.slopePerWeek)) }} kg/week
						</div>
					</div>
				</div>
			</section>
		</template>

		<!-- Race projection: the trend toward the goal race, then every distance goal -->
		<template v-if="predictedHasData || racePredictor">
			<div class="section-head">
				<h2>Race projection</h2>
				<span class="section-note">Riegel<span v-if="racePredictor"> · from your {{ racePredictor.basedOn }}</span></span>
			</div>

			<section v-if="predictedHasData" class="panel chart-card predicted-card">
				<div class="chart-head">
					<h3>Projected {{ fmt(goalRaceKm) }} km time</h3>
					<div class="pred-badges">
						<span class="pt-badge"><span class="pt-lbl">Now</span><span class="mono">{{ predictedCurrent !== null ? fmtTime(predictedCurrent) : '—' }}</span></span>
						<span v-if="goalRaceSecs !== null" class="pt-badge"><span class="pt-lbl">Goal</span><span class="mono">{{ fmtTime(goalRaceSecs) }}</span></span>
						<span v-if="predictedDelta !== null" class="pt-badge" :class="predictedDelta <= 0 ? 'good' : 'off'">
							{{ predictedDelta <= 0 ? fmtTime(Math.abs(predictedDelta)) + ' ahead of goal' : fmtTime(predictedDelta) + ' to go' }}
						</span>
					</div>
				</div>
				<div class="chart-body"><canvas ref="predictedCanvas"></canvas></div>
				<p class="vo2-note">Projected finish for {{ fmt(goalRaceKm) }} km from the fastest run in each trailing 4-week window. Give the race a distance and goal time in Profile to show the goal line.</p>
			</section>

			<section v-if="racePredictor" class="pr-grid predicted-grid">
				<div v-for="d in predictedVsGoal" :key="d.key" class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> {{ d.label }}</span>
					<span class="pr-value mono">{{ d.predicted }}</span>
					<span v-if="d.goal" class="pr-goal">goal <span class="mono">{{ d.goal }}</span></span>
					<span v-if="d.deltaLabel" class="pr-delta" :class="d.ahead ? 'good' : 'off'">{{ d.deltaLabel }}</span>
				</div>
			</section>
		</template>

		<!-- VO2 Max -->
		<template v-if="vo2HasData">
			<div class="section-head"><h2>Aerobic fitness</h2><span class="section-note">VO₂ max · estimated from pace + HR</span></div>
			<section class="panel chart-card vo2-card">
				<div class="chart-head">
					<h3>VO₂ max trend</h3>
					<div class="vo2-badge-row">
						<span v-if="vo2CurrentRun" class="vo2-badge run">
							<span class="vo2-badge-label">Running</span>
							<span class="mono">{{ vo2CurrentRun }}</span>
							<span class="vo2-badge-unit">ml/kg/min</span>
							<span class="vo2-zone-chip" :style="{ color: vo2Zone(vo2CurrentRun).color }">{{ vo2Zone(vo2CurrentRun).label }}</span>
						</span>
					</div>
				</div>
				<div class="chart-body vo2-chart-body"><canvas ref="vo2Canvas"></canvas></div>
				<p class="vo2-note">8-activity rolling average from running. Estimated via ACSM oxygen cost + Swain %HRmax→%VO₂max formula. Requires a heart rate monitor.</p>
			</section>
		</template>
		</template>

		<template v-if="tab === 'trends'">
		<!-- Trends -->
		<div class="section-head"><h2>Trends</h2><span class="section-note">last 12 weeks</span></div>
		<section class="chart-grid">
			<div class="panel chart-card">
				<div class="chart-head"><h3>Weekly distance</h3><span class="note">running vs bike</span></div>
				<div class="chart-body"><canvas ref="distanceCanvas"></canvas></div>
			</div>
			<div class="panel chart-card">
				<div class="chart-head"><h3><span class="dot gym"></span>Weekly tonnage</h3><span class="note">gym load</span></div>
				<div class="chart-body"><canvas ref="tonnageCanvas"></canvas></div>
			</div>
			<div class="panel chart-card">
				<div class="chart-head"><h3><span class="dot weight"></span>Body weight</h3><span class="note">vs goal</span></div>
				<div class="chart-body"><canvas ref="weightCanvas"></canvas></div>
			</div>
			<div class="panel chart-card">
				<div class="chart-head"><h3>Sport mix</h3><span class="note">all completed</span></div>
				<div class="chart-body"><canvas ref="mixCanvas"></canvas></div>
			</div>
		</section>

		<!-- Zone distribution -->
		<section v-if="zonesHasData" class="zone-section" style="margin-top: 14px">
			<div class="panel chart-card">
				<div class="chart-head">
					<h3>Weekly zones</h3>
					<span class="note">% of run time · 12 weeks · Karvonen · max {{ maxHRDisplay }} / rest {{ restingHR }} bpm</span>
				</div>
				<div class="chart-body"><canvas ref="zoneCanvas"></canvas></div>
			</div>
			<div class="panel chart-card">
				<div class="chart-head">
					<h3>Zone balance</h3>
					<span class="note">last 4 weeks</span>
				</div>
				<div class="chart-body"><canvas ref="zoneDonutCanvas"></canvas></div>
			</div>
		</section>

		<!-- Activity -->
		<section class="panel chart-card heatmap-card" style="margin-top: 14px">
			<div class="chart-head">
				<h3>{{ isHeatmap ? 'Activity · last year' : 'Sessions by month' }}</h3>
				<div class="seg">
					<button :class="{ active: isHeatmap }" @click="isHeatmap = true">Heatmap</button>
					<button :class="{ active: !isHeatmap }" @click="setMonthly">Monthly</button>
				</div>
			</div>
			<div v-show="isHeatmap" class="heatmap-wrap">
				<div class="heatmap">
					<div class="hm-days"><span></span><span v-for="(d, i) in ['M','T','W','T','F','S','S']" :key="i">{{ d }}</span></div>
					<div class="hm-weeks">
						<div v-for="(week, wi) in heatmapWeeks" :key="wi" class="hm-col">
							<span class="hm-month">{{ week.monthLabel }}</span>
							<div v-for="(day, di) in week.days" :key="di" class="hm-cell"
								:style="{ backgroundColor: heatColor(day) }" :title="`${day.dateStr}: ${day.value || 0} workout(s)`"></div>
						</div>
					</div>
				</div>
				<div class="hm-legend"><span>Less</span><i v-for="n in 4" :key="n" :style="{ opacity: 0.25 + n * 0.18 }"></i><span>More</span></div>
			</div>
			<div v-show="!isHeatmap" class="chart-body monthly"><canvas ref="monthlyCanvas"></canvas></div>
		</section>

		<!-- Recent activities -->
		<div class="section-head"><h2>Recent activities</h2><span class="section-note">tap to see splits, map &amp; stats</span></div>
		<section class="panel recent-panel">
			<router-link v-for="w in recentActivities" :key="w.id" :to="`/workout/${w.id}`" class="recent-row">
				<span class="recent-dot" :style="{ background: sportColor(w) }"></span>
				<span class="recent-name">{{ w.name }}</span>
				<span class="recent-date">{{ formatActivityDate(w.date) }}</span>
				<span class="recent-stat mono">{{ activityStat(w) }}</span>
				<n-icon class="recent-chev" :component="ChevronForwardOutline" />
			</router-link>
			<div v-if="recentActivities.length === 0" class="recent-empty">No completed workouts yet.</div>
		</section>

		<!-- Running PRs from Strava -->
		<template v-if="stravaRunPRs">
			<div class="section-head">
				<h2>Running PRs</h2>
				<span class="section-note">best times from your activities</span>
			</div>
			<section class="pr-grid">
				<div v-if="stravaRunPRs.fiveK" class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> 5 km</span>
					<span class="pr-value mono">{{ stravaRunPRs.fiveK }}</span>
				</div>
				<div v-if="stravaRunPRs.tenK" class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> 10 km</span>
					<span class="pr-value mono">{{ stravaRunPRs.tenK }}</span>
				</div>
				<div v-if="stravaRunPRs.half" class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> Half marathon</span>
					<span class="pr-value mono">{{ stravaRunPRs.half }}</span>
				</div>
				<div v-if="stravaRunPRs.full" class="pr-card">
					<span class="pr-label"><n-icon :component="TrophyOutline" /> Marathon</span>
					<span class="pr-value mono">{{ stravaRunPRs.full }}</span>
				</div>
			</section>
		</template>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, onUnmounted, nextTick, watch } from 'vue'
import { NIcon } from 'naive-ui'
import {
	WalkOutline, BarbellOutline, BodyOutline, CheckmarkDoneOutline,
	FlameOutline, FlagOutline, TrophyOutline, AddOutline, ChevronForwardOutline,
} from '@vicons/ionicons5'
import Chart from 'chart.js/auto'
import 'chartjs-adapter-date-fns' // registers the time scale the VDOT trend uses
import {
	format, parseISO, startOfWeek, endOfWeek, subWeeks, addWeeks, addDays, subYears,
	isWithinInterval, differenceInCalendarDays, startOfDay, isSameMonth, addMonths,
} from 'date-fns'
import { db } from '@/db'
import { activityApi } from '@/activities'
import type { Workout, DailyWeight, RaceGoal } from '@/types'
import { getSportColor, isDistanceSport, noteSteps, SPORT_TYPES, SPORT_LABELS } from '@/utils/workouts'
import { buildActivityIndex, effectiveWorkoutType, effectiveDistanceKm } from '@/utils/workoutSport'
import { PULSE_ZONES, getHRSettings, timeInZones, estimateVO2max } from '@/utils/analysis'
import { settings, targetForDate, distanceGoals, hydrateSettings } from '@/settings'
import { currentVdot, currentFitness, vdotTrend, vdotSamples, fitnessLine, trackedTargets, setActivities } from '@/fitness'
import { sessionPace } from '@/utils/paceAdvice'
import { DISTANCES, DISTANCE_LABELS, type DistanceKey } from '@/utils/vdot'

const workouts = ref<Workout[]>([])
const dailyWeights = ref<DailyWeight[]>([])
const raceGoals = ref<RaceGoal[]>([])
const userName = computed(() => settings.userName)
const goalWeight = computed(() => settings.goalWeight)

const fmt = (n: number) => {
	const r = Math.round(n * 10) / 10
	return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

const now = new Date()
const weekStart = startOfWeek(now, { weekStartsOn: 1 })
const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

const greeting = computed(() => {
	const h = now.getHours()
	if (h < 12) return 'Good morning'
	if (h < 18) return 'Good afternoon'
	return 'Good evening'
})
const todayLabel = computed(() => format(now, 'EEEE, d MMMM'))

/**
 * Where a workout has a recording behind it, the FIT file's sport and distance
 * win over the hand-entered `type`/`distance` columns. Shadows the imported
 * getWorkoutType so every call site below is corrected at once.
 */
const activityIndex = computed(() => buildActivityIndex(stravaActivities.value))
const getWorkoutType = (w: Workout) => effectiveWorkoutType(w, activityIndex.value)
const workoutKm = (w: Workout) => effectiveDistanceKm(w, activityIndex.value)

const completed = computed(() => workouts.value.filter(w => w.isCompleted === 1))
const inThisWeek = (w: Workout) => isWithinInterval(parseISO(w.date), { start: weekStart, end: weekEnd })

const runWeek = computed(() => completed.value.filter(w => inThisWeek(w) && getWorkoutType(w) === 'running').reduce((s, w) => s + (workoutKm(w) || 0), 0))
const bikeWeek = computed(() => completed.value.filter(w => inThisWeek(w) && getWorkoutType(w) === 'bike').reduce((s, w) => s + (workoutKm(w) || 0), 0))
const thisWeekDistance = computed(() => runWeek.value + bikeWeek.value)

const weekPlanned = computed(() => workouts.value.filter(w => inThisWeek(w) && getWorkoutType(w) !== 'rest'))
const sessionsPlanned = computed(() => weekPlanned.value.length)
const sessionsDone = computed(() => weekPlanned.value.filter(w => w.isCompleted === 1).length)
const sessionsPct = computed(() => sessionsPlanned.value ? Math.round((sessionsDone.value / sessionsPlanned.value) * 100) : 0)

const gymThisWeek = computed(() => completed.value.filter(w => inThisWeek(w) && getWorkoutType(w) === 'gym'))
const gymSessionsThisWeek = computed(() => gymThisWeek.value.length)
const thisWeekTonnage = computed(() => gymThisWeek.value.reduce((s, w) => s + (w.totalWeightLifted || 0), 0) / 1000)

const latestWeight = computed(() => {
	if (!dailyWeights.value.length) return null
	return [...dailyWeights.value].sort((a, b) => b.date.localeCompare(a.date))[0].weight
})
const weightToGoal = computed(() => latestWeight.value && goalWeight.value ? Math.round((latestWeight.value - goalWeight.value) * 10) / 10 : 0)

const weekStreak = computed(() => {
	let streak = 0
	for (let i = 0; i < 104; i++) {
		const s = subWeeks(weekStart, i), e = subWeeks(weekEnd, i)
		const has = completed.value.some(w => isWithinInterval(parseISO(w.date), { start: s, end: e }))
		if (has) streak++
		else if (i === 0) continue
		else break
	}
	return streak
})

const weekDays = computed(() => {
	const todayStr = format(now, 'yyyy-MM-dd')
	return Array.from({ length: 7 }, (_, i) => {
		const d = addDays(weekStart, i), ds = format(d, 'yyyy-MM-dd')
		return { key: ds, name: format(d, 'EEEEE'), isToday: ds === todayStr, workouts: workouts.value.filter(w => w.date === ds) }
	})
})
const sportColor = (w: Workout) => getSportColor(getWorkoutType(w))
const chipLabel = (w: Workout) => {
	const t = getWorkoutType(w)
	const km = workoutKm(w)
	if (isDistanceSport(t) && km) return `${fmt(km)}k`
	return t === 'rest' ? 'rest' : t.slice(0, 3)
}

// ===== Today =====
const todayStr = format(now, 'yyyy-MM-dd')
const todaysWorkouts = computed(() => workouts.value.filter(w => w.date === todayStr))
const todayIsRest = computed(() =>
	todaysWorkouts.value.length === 0 || todaysWorkouts.value.every(w => getWorkoutType(w) === 'rest'))
const todayAllDone = computed(() =>
	todaysWorkouts.value.length > 0 && todaysWorkouts.value.every(w => w.isCompleted === 1))

const completingId = ref<number | null>(null)

async function completeToday(w: Workout) {
	if (w.isCompleted === 1 || completingId.value !== null) return
	completingId.value = w.id
	try {
		await db.completeWorkout({ id: w.id, isCompleted: 1 })
		await load()
	} catch (e) {
		console.error('Failed to complete workout', e)
	} finally {
		completingId.value = null
	}
}

/** The session's pace, derived live from current fitness (or its goal, for race pace). */
const todayPace = (w: Workout) => sessionPace(w, {
	currentVdot: currentVdot.value,
	goalFor: (date: string) => {
		const t = targetForDate(date)
		return t ? { vdot: t.neededVdot, distanceM: t.distanceM, name: t.name } : null
	},
})

const sessionSteps = (w: Workout) => noteSteps(w)

// ===== Goal tracker =====
const fitnessSourceLabel = computed(() => {
	const f = currentFitness.value
	if (!f) return ''
	if (f.source === 'override') return 'set manually'
	if (f.source === 'race') return `from ${f.label}`
	return `from ${f.label}${f.stale ? ' (stale)' : ''}`
})

/**
 * How far along the gap you are, as a bar. Anchored 6 VDOT below the target so
 * a goal you're miles off still shows movement rather than a flat zero.
 */
const GOAL_BAR_SPAN = 6
function goalBarPct(t: { neededVdot: number; progress: { currentVdot: number } }) {
	const floor = t.neededVdot - GOAL_BAR_SPAN
	const pct = ((t.progress.currentVdot - floor) / GOAL_BAR_SPAN) * 100
	return Math.max(2, Math.min(100, Math.round(pct)))
}

// ===== Fitness trend (VDOT over time) =====

/** Enough readings to draw a line through. */
const vdotTrendHasData = computed(() => vdotSamples.value.length >= 3)

const recentActivities = computed(() =>
	[...completed.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6))
const formatActivityDate = (d: string) => format(parseISO(d), 'EEE d MMM')
const activityStat = (w: Workout) => {
	const t = getWorkoutType(w)
	const km = workoutKm(w)
	if (isDistanceSport(t) && km) return `${fmt(km)} km`
	if (t === 'gym' && w.totalWeightLifted) return `${fmt(w.totalWeightLifted / 1000)} t`
	if (w.actualDuration) return `${w.actualDuration} min`
	return ''
}

const nextRace = computed(() => raceGoals.value
	.filter(g => differenceInCalendarDays(parseISO(g.date), startOfDay(now)) >= 0)
	.sort((a, b) => a.date.localeCompare(b.date))[0] || null)
const nextRaceDays = computed(() => nextRace.value ? differenceInCalendarDays(parseISO(nextRace.value.date), startOfDay(now)) : null)
const formatRaceDate = (d: string) => format(parseISO(d), 'd MMM yyyy')

// Week-by-week plan progress toward the next race (last 2 weeks = taper)
const planProgress = computed(() => {
	if (!nextRace.value) return null
	const raceDate = parseISO(nextRace.value.date)
	const dates = workouts.value.map(w => w.date).sort()
	if (!dates.length) return null
	let start = startOfWeek(parseISO(dates[0]), { weekStartsOn: 1 })
	const maxStart = subWeeks(startOfWeek(raceDate, { weekStartsOn: 1 }), 31)
	if (start < maxStart) start = maxStart
	const total = Math.max(1, Math.ceil((differenceInCalendarDays(raceDate, start) + 1) / 7))
	const current = Math.min(total, Math.max(1, Math.ceil((differenceInCalendarDays(startOfDay(now), start) + 1) / 7)))
	const weeks = Array.from({ length: total }, (_, i) => ({
		done: i < current - 1,
		current: i === current - 1,
		taper: i >= total - 2,
	}))
	return { weeks, current, total }
})

// ===== Metric card sparklines & deltas =====
const sparkWeeks = computed(() => weekBuckets(8).map(wk => {
	const inWk = (w: Workout) => isWithinInterval(parseISO(w.date), { start: wk.start, end: wk.end })
	return {
		dist: completed.value.filter(w => inWk(w) && isDistanceSport(getWorkoutType(w))).reduce((s, w) => s + (workoutKm(w) || 0), 0),
		ton: completed.value.filter(w => inWk(w) && getWorkoutType(w) === 'gym').reduce((s, w) => s + (w.totalWeightLifted || 0), 0) / 1000,
	}
}))
const distSpark = computed(() => {
	const m = Math.max(1, ...sparkWeeks.value.map(w => w.dist))
	return sparkWeeks.value.map(w => Math.round((w.dist / m) * 100))
})
const tonSpark = computed(() => {
	const m = Math.max(1, ...sparkWeeks.value.map(w => w.ton))
	return sparkWeeks.value.map(w => Math.round((w.ton / m) * 100))
})
const distDelta = computed(() => {
	const w = sparkWeeks.value
	return w.length >= 2 ? Math.round((w[w.length - 1].dist - w[w.length - 2].dist) * 10) / 10 : 0
})
const weightDelta = computed(() => {
	if (!latestWeight.value) return null
	const cutoff = format(addDays(now, -28), 'yyyy-MM-dd')
	const older = [...dailyWeights.value].filter(w => w.date <= cutoff).sort((a, b) => b.date.localeCompare(a.date))[0]
	return older ? Math.round((latestWeight.value - older.weight) * 10) / 10 : null
})

// Median easy-run pace (sec/km) in the aerobic HR band, last 4 weeks vs the 4 before
const aerobicPace = computed(() => {
	const { maxHR, restHR } = getHRSettings(stravaActivities.value)
	if (maxHR < 140) return null
	const hrr = maxHR - restHR
	const lo = restHR + hrr * 0.55, hi = restHR + hrr * 0.75
	const runs = stravaActivities.value
		.filter((a: any) => {
			const st = (a.sport_type || a.type || '').toLowerCase()
			return st === 'run' && a.average_heartrate >= lo && a.average_heartrate <= hi && a.average_speed > 1.5
		})
		.map((a: any) => ({ date: new Date(a.start_date_local || a.start_date), pace: 1000 / a.average_speed }))
	const median = (xs: number[]) => {
		if (!xs.length) return null
		const s = [...xs].sort((a, b) => a - b)
		return s[Math.floor(s.length / 2)]
	}
	const fourWk = subWeeks(now, 4), eightWk = subWeeks(now, 8)
	const cur = median(runs.filter(r => r.date >= fourWk).map(r => r.pace))
	if (cur === null) return null
	const prev = median(runs.filter(r => r.date >= eightWk && r.date < fourWk).map(r => r.pace))
	return {
		paceSec: cur,
		delta: prev !== null ? cur - prev : null,
		hrLabel: `${Math.round(lo)}–${Math.round(hi)} bpm`,
	}
})

// PRs set within the last 7 days — worth celebrating on the front page
const recentPRs = computed(() => {
	const out: string[] = []
	const weekAgo = addDays(now, -7)
	const runs = completed.value.filter(w => getWorkoutType(w) === 'running' && workoutKm(w))
	if (runs.length >= 2) {
		const best = runs.reduce((b, w) => (workoutKm(w)! > workoutKm(b)! ? w : b))
		if (parseISO(best.date) >= weekAgo) out.push(`Longest run ever — ${fmt(workoutKm(best)!)} km`)
	}
	for (const name of ['1 km', '5 km', '10 km', 'Half marathon']) {
		let bestT: number | null = null
		let bestDate: Date | null = null
		for (const a of stravaActivities.value) {
			const be = a.best_efforts?.find((b: any) => b.name === name)
			if (be && (bestT === null || be.elapsed_time < bestT)) {
				bestT = be.elapsed_time
				bestDate = new Date(a.start_date_local || a.start_date)
			}
		}
		if (bestT !== null && bestDate && bestDate >= weekAgo) out.push(`New ${name} best — ${fmtTime(bestT)}`)
	}
	return out
})

// PRs

// ===== Predictions =====
function linReg(xs: number[], ys: number[]) {
	const n = xs.length
	if (n < 2) return null
	const mx = xs.reduce((s, x) => s + x, 0) / n
	const my = ys.reduce((s, y) => s + y, 0) / n
	const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
	const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
	if (!den) return null
	const slope = num / den
	return { slope, predict: (x: number) => slope * x + (my - slope * mx) }
}

const weightPrediction = computed(() => {
	const sorted = [...dailyWeights.value].sort((a, b) => a.date.localeCompare(b.date))
	if (sorted.length < 3) return null
	const origin = new Date(sorted[0].date).getTime() / 86400000
	const xs = sorted.map(w => new Date(w.date).getTime() / 86400000 - origin)
	const ys = sorted.map(w => w.weight)
	const reg = linReg(xs, ys)
	if (!reg) return null
	const slopePerWeek = reg.slope * 7
	const lastX = xs[xs.length - 1]
	const proj4w = Math.round(reg.predict(lastX + 28) * 10) / 10
	const proj12w = Math.round(reg.predict(lastX + 84) * 10) / 10
	const current = ys[ys.length - 1]
	const weeksToGoal = goalWeight.value !== null && slopePerWeek !== 0
		? Math.ceil((goalWeight.value - current) / slopePerWeek)
		: null
	return { slopePerWeek, proj4w, proj12w, weeksToGoal }
})

const runningPrediction = computed(() => {
	const weeklyData = Array.from({ length: 12 }, (_, i) => {
		const s = subWeeks(weekStart, 11 - i)
		const e = endOfWeek(s, { weekStartsOn: 1 })
		return completed.value.filter(w => isWithinInterval(parseISO(w.date), { start: s, end: e }) && getWorkoutType(w) === 'running').reduce((sum, w) => sum + (workoutKm(w) || 0), 0)
	})
	const nonZero = weeklyData.filter(v => v > 0)
	if (nonZero.length < 3) return null
	const reg = linReg(weeklyData.map((_, i) => i), weeklyData)
	if (!reg) return null
	const proj4w = Math.max(0, Math.round(reg.predict(15) * 10) / 10)
	const currentAvg = Math.round((nonZero.reduce((s, v) => s + v, 0) / nonZero.length) * 10) / 10
	return { slopePerWeek: reg.slope, proj4w, currentAvg }
})

// ===== VO2 max =====
const vo2Estimates = computed(() => {
	const acts = stravaActivities.value
	if (!acts.length) return []

	// Profile max HR override, else the highest max_heartrate ever seen
	const maxHRever = getHRSettings(acts).maxHR
	if (maxHRever < 140) return [] // no usable HR data

	return acts
		.filter((a: any) => {
			const st = (a.sport_type || a.type || '').toLowerCase()
			return st === 'run' && a.average_heartrate && a.average_speed
		})
		.map((a: any) => {
			// ACSM oxygen cost at grade-adjusted pace + Swain %HRmax→%VO2max
			const val = estimateVO2max(a, maxHRever)
			if (val === null) return null
			return {
				date: (a.start_date_local || a.start_date || '').slice(0, 10),
				vo2max: val,
				sport: 'run' as const,
			}
		})
		.filter(Boolean)
		.sort((a: any, b: any) => a.date.localeCompare(b.date)) as { date: string; vo2max: number; sport: 'run' }[]
})

const vo2HasData = computed(() => vo2Estimates.value.length >= 3)

// Rolling 28-day average for a given sport
function vo2Rolling(sport: 'run' | 'bike', dates: string[]) {
	const pts = vo2Estimates.value.filter(e => e.sport === sport)
	return dates.map(d => {
		const cutoff = new Date(d)
		cutoff.setDate(cutoff.getDate() - 28)
		const win = pts.filter(e => {
			const ed = new Date(e.date)
			return ed <= new Date(d) && ed >= cutoff
		})
		return win.length ? Math.round((win.reduce((s, e) => s + e.vo2max, 0) / win.length) * 10) / 10 : null
	})
}

const vo2CurrentRun = computed(() => {
	const pts = vo2Estimates.value.filter(e => e.sport === 'run').slice(-8)
	if (!pts.length) return null
	return Math.round((pts.reduce((s, e) => s + e.vo2max, 0) / pts.length) * 10) / 10
})

function vo2Zone(v: number | null) {
	if (!v) return { label: '', color: 'var(--text-muted)' }
	if (v >= 60) return { label: 'Superior', color: '#00c9a7' }
	if (v >= 52) return { label: 'Excellent', color: '#56d364' }
	if (v >= 43) return { label: 'Good', color: '#f0b429' }
	if (v >= 35) return { label: 'Fair', color: '#fb8c00' }
	return { label: 'Poor', color: '#e53935' }
}

// ===== Running PRs & Race Predictor =====
function fmtTime(secs: number) {
	const h = Math.floor(secs / 3600)
	const m = Math.floor((secs % 3600) / 60)
	const s = Math.round(secs % 60)
	return h > 0
		? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
		: `${m}:${s.toString().padStart(2, '0')}`
}

const stravaRunPRs = computed(() => {
	const runs = stravaActivities.value.filter((a: any) => {
		const st = (a.sport_type || a.type || '').toLowerCase()
		return st === 'run' && a.distance && a.moving_time
	})
	// Prefer exact best efforts from imported streams (fastest stretch inside
	// any run); fall back to whole activities near the target distance.
	const bestIn = (effortName: string, minM: number, maxM: number) => {
		let best: number | null = null
		for (const a of runs) {
			const be = a.best_efforts?.find((b: any) => b.name === effortName)
			if (be && (best === null || be.elapsed_time < best)) best = be.elapsed_time
			if (!a.best_efforts?.length && a.distance >= minM && a.distance <= maxM) {
				if (best === null || a.moving_time < best) best = a.moving_time
			}
		}
		return best !== null ? fmtTime(best) : null
	}
	const r = {
		fiveK: bestIn('5 km', 4500, 5800),
		tenK: bestIn('10 km', 9000, 11000),
		half: bestIn('Half marathon', 19000, 22000),
		full: bestIn('Marathon', 40000, 45000),
	}
	return Object.values(r).some(v => v !== null) ? r : null
})

const racePredictor = computed(() => {
	const runs = stravaActivities.value.filter((a: any) => {
		const st = (a.sport_type || a.type || '').toLowerCase()
		return st === 'run' && a.distance >= 5000 && a.moving_time
	})
	if (runs.length < 2) return null
	// Best-pace run as reference (faster = more fit → more reliable predictor)
	const ref = runs.reduce((b: any, a: any) =>
		a.moving_time / a.distance < b.moving_time / b.distance ? a : b
	)
	const riegel = (targetM: number) => Math.round(ref.moving_time * Math.pow(targetM / ref.distance, 1.06))
	const dateStr = (ref.start_date_local || ref.start_date || '').slice(0, 10)
	const dateLabel = dateStr ? format(parseISO(dateStr), 'd MMM yyyy') : ''
	return {
		secs: Object.fromEntries(
			(Object.keys(DISTANCES) as DistanceKey[]).map(k => [k, riegel(DISTANCES[k])]),
		) as Record<DistanceKey, number>,
		basedOn: `${fmt(ref.distance / 1000)} km on ${dateLabel}`,
	}
})

/**
 * Where each standing distance goal sits against what your current fitness
 * predicts. This is the "am I on track" answer, per distance.
 */
const predictedVsGoal = computed(() => {
	const rp = racePredictor.value
	if (!rp) return []
	return (Object.keys(DISTANCES) as DistanceKey[]).map(key => {
		const predicted = rp.secs[key]
		const goal = distanceGoals[DISTANCES[key]]?.secs ?? null
		const delta = goal !== null ? predicted - goal : null
		return {
			key,
			label: DISTANCE_LABELS[key],
			predicted: fmtTime(predicted),
			goal: goal !== null ? fmtTime(goal) : null,
			ahead: delta !== null && delta <= 0,
			deltaLabel: delta === null
				? null
				: delta <= 0
					? `${fmtTime(Math.abs(delta))} ahead of goal`
					: `${fmtTime(delta)} to find`,
		}
	})
})

// ===== Predicted race time vs goal (Runna-style progress) =====

/** Last-resort distance when a race record has none: read it out of the name. */
function parseRaceKm(name: string): number | null {
	const n = (name || '').toLowerCase()
	if (/marathon/.test(n) && !/half|halv/.test(n)) return 42.195
	if (/half|halv/.test(n)) return 21.0975
	const m = n.match(/(\d{1,3})\s*k/)
	return m ? parseFloat(m[1]) : null
}

const goalRaceKm = computed(() => {
	const race = nextRace.value
	if (race?.distance_km) return race.distance_km
	const inferred = race ? parseRaceKm(race.name) : null
	return inferred || (race ? 30 : 10)
})
const goalRaceSecs = computed(() => nextRace.value?.goal_time_secs ?? null)

// Recorded runs (imported activities + manually-completed runs) as {date, distM, timeSec}.
const runSamples = computed(() => {
	const out: { date: Date; distM: number; timeSec: number }[] = []
	for (const a of stravaActivities.value) {
		const st = (a.sport_type || a.type || '').toLowerCase()
		if (st === 'run' && a.distance && a.moving_time)
			out.push({ date: new Date(a.start_date_local || a.start_date), distM: a.distance, timeSec: a.moving_time })
	}
	for (const w of completed.value) {
		const km = workoutKm(w)
		if (getWorkoutType(w) === 'running' && km && w.actualDuration)
			out.push({ date: parseISO(w.date), distM: km * 1000, timeSec: w.actualDuration * 60 })
	}
	return out
})

const predictedTimeSeries = computed(() => {
	const targetM = goalRaceKm.value * 1000
	return weekBuckets(12).map(wk => {
		const winStart = subWeeks(wk.end, 4)
		const win = runSamples.value.filter(s => s.date > winStart && s.date <= wk.end && s.distM >= 3000)
		if (!win.length) return { label: wk.label, secs: null as number | null }
		const ref = win.reduce((b, a) => (a.timeSec / a.distM) < (b.timeSec / b.distM) ? a : b)
		return { label: wk.label, secs: Math.round(ref.timeSec * Math.pow(targetM / ref.distM, 1.06)) }
	})
})
const predictedHasData = computed(() => predictedTimeSeries.value.filter(p => p.secs !== null).length >= 2)
const predictedCurrent = computed(() => {
	const v = [...predictedTimeSeries.value].reverse().find(p => p.secs !== null)
	return v ? v.secs : null
})
const predictedDelta = computed(() =>
	predictedCurrent.value !== null && goalRaceSecs.value !== null ? predictedCurrent.value - goalRaceSecs.value : null)

function buildPredicted() {
	if (!predictedCanvas.value || !predictedHasData.value) return
	const series = predictedTimeSeries.value
	const labels = series.map(p => p.label)
	const runColor = getSportColor('running')
	const datasets: any[] = [{
		label: `Predicted ${fmt(goalRaceKm.value)} km`,
		data: series.map(p => p.secs),
		borderColor: runColor, backgroundColor: 'transparent', borderWidth: 2, tension: 0.3,
		pointRadius: 3, pointHoverRadius: 5, spanGaps: true,
	}]
	if (goalRaceSecs.value !== null) {
		datasets.push({
			label: 'Goal', data: labels.map(() => goalRaceSecs.value),
			borderColor: css('--success-color'), borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0,
		})
	}
	charts.push(new Chart(predictedCanvas.value, {
		type: 'line',
		data: { labels, datasets },
		options: {
			...baseOpts(),
			plugins: {
				...baseOpts().plugins,
				legend: { display: true, position: 'bottom', labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true } },
				tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${fmtTime(ctx.raw)}` } },
			},
			scales: {
				...(baseOpts() as any).scales,
				y: { ...(baseOpts() as any).scales.y, ticks: { color: css('--text-muted'), font: { size: 10 }, callback: (v: any) => fmtTime(v) } },
				x: { ...(baseOpts() as any).scales.x, ticks: { color: css('--text-muted'), font: { size: 10 }, maxTicksLimit: 10, maxRotation: 0 } },
			},
		} as any,
	}))
}

// ===== Weekly plan adherence (planned vs completed) =====
const planWeeks = computed(() => weekBuckets(8).map(wk => {
	const inWk = (w: Workout) => isWithinInterval(parseISO(w.date), { start: wk.start, end: wk.end })
	const planned = workouts.value.filter(w => inWk(w) && getWorkoutType(w) !== 'rest')
	const done = planned.filter(w => w.isCompleted === 1)
	const plannedKm = planned.filter(w => isDistanceSport(getWorkoutType(w))).reduce((s, w) => s + (w.distance || 0), 0)
	const doneKm = done.filter(w => isDistanceSport(getWorkoutType(w))).reduce((s, w) => s + (workoutKm(w) || 0), 0)
	return {
		label: wk.label, planned: planned.length, done: done.length,
		plannedKm: Math.round(plannedKm), doneKm: Math.round(doneKm),
		pct: planned.length ? Math.round((done.length / planned.length) * 100) : null,
	}
}))
const planHasData = computed(() => planWeeks.value.some(w => w.planned > 0))
const thisWeekPlan = computed(() => planWeeks.value[planWeeks.value.length - 1])
const planRingPct = computed(() => thisWeekPlan.value?.pct ?? 0)
const RING_CIRC = 2 * Math.PI * 52
const planRingDash = computed(() => `${(Math.min(planRingPct.value, 100) / 100) * RING_CIRC} ${RING_CIRC}`)

// ===== Zone distribution =====
const maxHRDisplay = computed(() => getHRSettings(stravaActivities.value).maxHR)
const restingHR = computed(() => settings.restingHR)

const zonesHasData = computed(() => {
	if (maxHRDisplay.value < 140) return false
	return stravaActivities.value.filter((a: any) => {
		const st = (a.sport_type || a.type || '').toLowerCase()
		return st === 'run' && (a.streams?.heartrate || a.average_heartrate)
	}).length >= 3
})

// ===== Charts =====
const isHeatmap = ref(true)
const heatmapWeeks = ref<any[]>([])
const distanceCanvas = ref<HTMLCanvasElement | null>(null)
const tonnageCanvas = ref<HTMLCanvasElement | null>(null)
const weightCanvas = ref<HTMLCanvasElement | null>(null)
const mixCanvas = ref<HTMLCanvasElement | null>(null)
const monthlyCanvas = ref<HTMLCanvasElement | null>(null)
const vo2Canvas = ref<HTMLCanvasElement | null>(null)
const zoneCanvas = ref<HTMLCanvasElement | null>(null)
const zoneDonutCanvas = ref<HTMLCanvasElement | null>(null)
const predictedCanvas = ref<HTMLCanvasElement | null>(null)
const vdotCanvas = ref<HTMLCanvasElement | null>(null)
let charts: Chart[] = []

/** Only the active tab's canvases exist, so only its charts get built. */
type Tab = 'today' | 'goals' | 'trends'
const tab = ref<Tab>('today')
const TABS: { key: Tab; label: string }[] = [
	{ key: 'today', label: 'Today' },
	{ key: 'goals', label: 'Goals' },
	{ key: 'trends', label: 'Trends' },
]

const stravaActivities = ref<any[]>([])

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()

const baseOpts = (yLabel?: string) => ({
	responsive: true,
	maintainAspectRatio: false,
	plugins: {
		legend: { display: false },
		tooltip: { backgroundColor: css('--surface-2'), borderColor: css('--border-strong'), borderWidth: 1, titleColor: css('--text-color'), bodyColor: css('--text-secondary'), padding: 10, cornerRadius: 8, displayColors: false },
	},
	scales: {
		x: { ticks: { color: css('--text-muted'), font: { size: 10 } }, grid: { display: false }, border: { display: false } },
		y: { ticks: { color: css('--text-muted'), font: { size: 10 } }, grid: { color: css('--border-color') }, border: { display: false }, title: yLabel ? { display: true, text: yLabel, color: css('--text-muted'), font: { size: 11 } } : undefined },
	},
})

function weekBuckets(count: number) {
	const ws = startOfWeek(new Date(), { weekStartsOn: 1 })
	const out: { start: Date; end: Date; label: string }[] = []
	for (let i = count - 1; i >= 0; i--) {
		const s = subWeeks(ws, i)
		out.push({ start: s, end: endOfWeek(s, { weekStartsOn: 1 }), label: format(s, 'd/M') })
	}
	return out
}

function buildDistance() {
	if (!distanceCanvas.value) return
	const weeks = weekBuckets(12)
	const sum = (type: 'running' | 'bike', wk: { start: Date; end: Date }) =>
		completed.value.filter(w => isWithinInterval(parseISO(w.date), { start: wk.start, end: wk.end }) && getWorkoutType(w) === type).reduce((s, w) => s + (workoutKm(w) || 0), 0)
	charts.push(new Chart(distanceCanvas.value, {
		type: 'bar',
		data: { labels: weeks.map(w => w.label), datasets: [
			{ label: 'Running', data: weeks.map(w => sum('running', w)), backgroundColor: getSportColor('running'), borderRadius: 4, maxBarThickness: 16 },
			{ label: 'Bike', data: weeks.map(w => sum('bike', w)), backgroundColor: getSportColor('bike'), borderRadius: 4, maxBarThickness: 16 },
		] },
		options: { ...baseOpts('km'), plugins: { ...baseOpts('km').plugins, legend: { display: true, position: 'bottom', labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true } } } } as any,
	}))
}

function buildTonnage() {
	if (!tonnageCanvas.value) return
	const weeks = weekBuckets(12)
	const data = weeks.map(wk => completed.value.filter(w => isWithinInterval(parseISO(w.date), { start: wk.start, end: wk.end }) && getWorkoutType(w) === 'gym').reduce((s, w) => s + (w.totalWeightLifted || 0), 0) / 1000)
	charts.push(new Chart(tonnageCanvas.value, {
		type: 'bar',
		data: { labels: weeks.map(w => w.label), datasets: [{ data, backgroundColor: getSportColor('gym'), borderRadius: 5, maxBarThickness: 26 }] },
		options: baseOpts('t'),
	}))
}

function buildWeight() {
	if (!weightCanvas.value) return
	const sorted = [...dailyWeights.value].sort((a, b) => a.date.localeCompare(b.date))
	const goalVal = goalWeight.value

	// Build 12-week projection from linear regression
	let projLabels: string[] = []
	let projValues: (number | null)[] = []
	if (sorted.length >= 3) {
		const origin = new Date(sorted[0].date).getTime() / 86400000
		const xs = sorted.map(w => new Date(w.date).getTime() / 86400000 - origin)
		const reg = linReg(xs, sorted.map(w => w.weight))
		if (reg) {
			const lastDate = parseISO(sorted[sorted.length - 1].date)
			const lastX = xs[xs.length - 1]
			for (let i = 1; i <= 6; i++) {
				projLabels.push(format(addDays(lastDate, i * 14), 'd/M'))
				projValues.push(Math.round(reg.predict(lastX + i * 14) * 10) / 10)
			}
		}
	}

	const allLabels = [...sorted.map(w => format(parseISO(w.date), 'd/M')), ...projLabels]
	const actualData: (number | null)[] = [...sorted.map(w => w.weight), ...projLabels.map(() => null)]
	const projData: (number | null)[] = [
		...sorted.map((_, i) => i === sorted.length - 1 ? sorted[i].weight : null),
		...projValues,
	]

	const datasets: any[] = [
		{ label: 'Weight', data: actualData, borderColor: css('--primary-color'), backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: 0, pointHoverRadius: 4 },
		...(projValues.length ? [{ label: 'Projected', data: projData, borderColor: css('--primary-color'), backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [5, 4], tension: 0.3, pointRadius: 0, pointHoverRadius: 4 }] : []),
		...(goalVal !== null ? [{ label: 'Goal', data: allLabels.map(() => goalVal), borderColor: css('--success-color'), borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0 }] : []),
	]
	charts.push(new Chart(weightCanvas.value, { type: 'line', data: { labels: allLabels, datasets }, options: baseOpts('kg') }))
}

function buildMix() {
	if (!mixCanvas.value) return
	const data = SPORT_TYPES.map(t => completed.value.filter(w => getWorkoutType(w) === t).length)
	charts.push(new Chart(mixCanvas.value, {
		type: 'doughnut',
		data: { labels: SPORT_TYPES.map(t => SPORT_LABELS[t]), datasets: [{ data, backgroundColor: SPORT_TYPES.map(t => getSportColor(t)), borderColor: css('--surface-color'), borderWidth: 2 }] },
		options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { color: css('--text-secondary'), boxWidth: 10, boxHeight: 10, font: { size: 11 }, usePointStyle: true } }, tooltip: { backgroundColor: css('--surface-2'), borderColor: css('--border-strong'), borderWidth: 1, titleColor: css('--text-color'), bodyColor: css('--text-secondary'), padding: 10, cornerRadius: 8 } } } as any,
	}))
}

function buildMonthly() {
	if (!monthlyCanvas.value) return
	const months: Date[] = []
	for (let i = 5; i >= 0; i--) months.push(addMonths(new Date(), -i))
	charts.push(new Chart(monthlyCanvas.value, {
		type: 'bar',
		data: { labels: months.map(m => format(m, 'MMM')), datasets: SPORT_TYPES.map(t => ({ label: SPORT_LABELS[t], data: months.map(m => completed.value.filter(w => getWorkoutType(w) === t && isSameMonth(parseISO(w.date), m)).length), backgroundColor: getSportColor(t), borderRadius: 4 })) },
		options: { ...baseOpts(), plugins: { legend: { display: true, position: 'bottom', labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true } } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { color: css('--text-muted') }, border: { display: false } }, y: { stacked: true, grid: { color: css('--border-color') }, ticks: { color: css('--text-muted') }, border: { display: false } } } } as any,
	}))
}

function buildHeatmap() {
	const today = new Date()
	const start = startOfWeek(subYears(today, 1), { weekStartsOn: 1 })
	const end = endOfWeek(today, { weekStartsOn: 1 })
	const dayData: Record<string, number> = {}
	completed.value.forEach(w => { const d = format(parseISO(w.date), 'yyyy-MM-dd'); dayData[d] = (dayData[d] || 0) + 1 })
	const weeks = []
	let cur = start
	while (cur <= end) {
		const days = []
		for (let i = 0; i < 7; i++) {
			const d = addDays(cur, i), ds = format(d, 'yyyy-MM-dd')
			days.push({ dateStr: format(d, 'MMM d, yyyy'), value: dayData[ds] || 0 })
		}
		weeks.push({ monthLabel: cur.getDate() <= 7 ? format(cur, 'MMM') : '', days })
		cur = addWeeks(cur, 1)
	}
	heatmapWeeks.value = weeks
}

function buildVO2() {
	if (!vo2Canvas.value || !vo2HasData.value) return
	const allDates = [...new Set(vo2Estimates.value.map(e => e.date))].sort()
	const labels = allDates.map(d => format(parseISO(d), 'd MMM yy'))
	const runColor = getSportColor('running')

	charts.push(new Chart(vo2Canvas.value, {
		type: 'line',
		data: {
			labels,
			datasets: [
				{
					label: 'VO₂max estimate',
					data: allDates.map(d => {
						const m = vo2Estimates.value.find(e => e.date === d)
						return m ? m.vo2max : null
					}),
					borderColor: runColor,
					borderWidth: 0,
					pointRadius: 5,
					pointHoverRadius: 7,
					pointBackgroundColor: runColor,
					spanGaps: false,
					tension: 0,
					showLine: false,
				},
				{
					label: '28-day rolling avg',
					data: vo2Rolling('run', allDates),
					borderColor: runColor,
					backgroundColor: 'transparent',
					borderWidth: 2,
					pointRadius: 0,
					tension: 0.4,
					spanGaps: true,
				},
			],
		},
		options: {
			...baseOpts('ml/kg/min'),
			plugins: {
				...baseOpts('ml/kg/min').plugins,
				legend: {
					display: true, position: 'bottom',
					labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true },
				},
			},
			scales: {
				...(baseOpts('ml/kg/min') as any).scales,
				y: {
					...(baseOpts('ml/kg/min') as any).scales.y,
					min: 25,
					ticks: { color: css('--text-muted'), font: { size: 10 }, stepSize: 5 },
				},
				x: {
					...(baseOpts('ml/kg/min') as any).scales.x,
					ticks: {
						color: css('--text-muted'), font: { size: 10 },
						maxTicksLimit: 10, maxRotation: 0,
					},
				},
			},
		} as any,
	}))
}

/** HR-carrying runs with per-activity zone seconds (stream-accurate when imported). */
function runZoneData() {
	const { maxHR, restHR } = getHRSettings(stravaActivities.value)
	return stravaActivities.value
		.filter((a: any) => {
			const st = (a.sport_type || a.type || '').toLowerCase()
			return st === 'run' && a.moving_time && (a.streams?.heartrate || a.average_heartrate)
		})
		.map((a: any) => ({
			date: new Date(a.start_date_local || a.start_date),
			zones: timeInZones(a, maxHR, restHR),
		}))
		.filter(r => r.zones)
}

function buildZones() {
	if (!zoneCanvas.value || !zonesHasData.value) return
	const runs = runZoneData()
	const weeks = weekBuckets(12)
	// zone seconds per week
	const weekZones = weeks.map(wk => {
		const sums = new Array(PULSE_ZONES.length).fill(0)
		for (const r of runs) {
			if (r.date >= wk.start && r.date <= wk.end) {
				r.zones!.forEach((t, i) => { sums[i] += t })
			}
		}
		return sums
	})
	const weekTotals = weekZones.map(z => z.reduce((s, t) => s + t, 0))
	const datasets = PULSE_ZONES.map((z, zi) => ({
		label: z.name,
		backgroundColor: z.color,
		data: weeks.map((_, wi) => {
			const total = weekTotals[wi]
			return total ? Math.round((weekZones[wi][zi] / total) * 100) : 0
		}),
		borderRadius: 3,
		maxBarThickness: 22,
	}))
	charts.push(new Chart(zoneCanvas.value, {
		type: 'bar',
		data: { labels: weeks.map(w => w.label), datasets },
		options: {
			...baseOpts('%'),
			plugins: {
				...baseOpts('%').plugins,
				legend: { display: true, position: 'bottom', labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true } },
				tooltip: {
					...baseOpts('%').plugins.tooltip,
					callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.raw}%` },
				},
			},
			scales: {
				x: { stacked: true, grid: { display: false }, ticks: { color: css('--text-muted'), font: { size: 10 } }, border: { display: false } },
				y: {
					stacked: true, max: 100,
					grid: { color: css('--border-color') },
					ticks: { color: css('--text-muted'), font: { size: 10 }, callback: (v: any) => v + '%' },
					border: { display: false },
				},
			},
		} as any,
	}))
}

function buildZoneDonut() {
	if (!zoneDonutCanvas.value || !zonesHasData.value) return
	const { maxHR, restHR } = getHRSettings(stravaActivities.value)
	const cutoff = subWeeks(new Date(), 4)
	const recent = runZoneData().filter(r => r.date >= cutoff)
	const sums = new Array(PULSE_ZONES.length).fill(0)
	for (const r of recent) r.zones!.forEach((t, i) => { sums[i] += t })
	const totalTime = sums.reduce((s, t) => s + t, 0)
	if (!totalTime) return

	const data = sums.map(t => Math.round((t / totalTime) * 100))

	const hrr = maxHR - restHR
	const labels = PULSE_ZONES.map(z => {
		const lo = restHR + hrr * z.min
		const hi = restHR + hrr * z.max
		return `${z.name} (${Math.round(lo)}–${z.max > 1 ? maxHR : Math.round(hi)})`
	})

	charts.push(new Chart(zoneDonutCanvas.value, {
		type: 'doughnut',
		data: {
			labels,
			datasets: [{ data, backgroundColor: PULSE_ZONES.map(z => z.color), borderWidth: 0, hoverOffset: 6 }],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			cutout: '60%',
			plugins: {
				legend: {
					display: true,
					position: 'right',
					labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 9 }, usePointStyle: true, padding: 7 },
				},
				tooltip: {
					backgroundColor: css('--surface-2'), borderColor: css('--border-strong'), borderWidth: 1,
					titleColor: css('--text-color'), bodyColor: css('--text-secondary'), padding: 10, cornerRadius: 8, displayColors: false,
					callbacks: { label: (ctx: any) => ` ${ctx.raw}% of run time` },
				},
			},
		} as any,
	}))
}

/**
 * VDOT over time: one point per run (the best VDOT that run implies), races drawn
 * larger and ringed, plus a dashed line at the VDOT each goal requires.
 *
 * A time axis, not a category axis — samples are irregular, and spacing them
 * evenly would flatter a month with lots of runs and squash a quiet one.
 */
function buildVdotTrend() {
	if (!vdotCanvas.value || !vdotTrendHasData.value) return

	const samples = vdotSamples.value
	const points = samples.map(s => ({ x: parseISO(s.date).getTime(), y: s.vdot, sample: s }))
	const isRace = (i: number) => samples[i].source === 'race'
	const runColor = getSportColor('running')

	const goalLines = trackedTargets.value.slice(0, 3).map((t, i) => ({
		label: `${t.name} needs ${t.neededVdot}`,
		data: [
			{ x: points[0].x, y: t.neededVdot },
			{ x: points[points.length - 1].x, y: t.neededVdot },
		],
		borderColor: [css('--success-color'), css('--warning-color'), css('--text-muted')][i],
		borderWidth: 1.5,
		borderDash: [5, 5],
		pointRadius: 0,
		fill: false,
	}))

	// The line that actually drives your paces: best effort in the trailing 90 days.
	const bestLine = fitnessLine.value.map(p => ({ x: parseISO(p.date).getTime(), y: p.vdot }))

	charts.push(new Chart(vdotCanvas.value, {
		type: 'line',
		data: {
			datasets: [
				{
					label: 'Fitness (best of last 90 days)',
					data: bestLine,
					borderColor: css('--primary-color'),
					backgroundColor: 'transparent',
					borderWidth: 2,
					tension: 0.2,
					pointRadius: 0,
					pointHoverRadius: 0,
				},
				{
					label: 'Each run',
					data: points,
					borderColor: 'transparent',
					backgroundColor: runColor,
					showLine: false,
					pointRadius: (ctx: any) => (isRace(ctx.dataIndex) ? 6 : 3),
					pointHoverRadius: (ctx: any) => (isRace(ctx.dataIndex) ? 8 : 5),
					pointBorderColor: (ctx: any) => (isRace(ctx.dataIndex) ? css('--text-color') : runColor),
					pointBorderWidth: (ctx: any) => (isRace(ctx.dataIndex) ? 2 : 0),
				},
				...goalLines,
			],
		},
		options: {
			...baseOpts('VDOT'),
			plugins: {
				...baseOpts().plugins,
				legend: { display: true, position: 'bottom', labels: { color: css('--text-secondary'), boxWidth: 10, font: { size: 10 }, usePointStyle: true } },
				tooltip: {
					...baseOpts().plugins.tooltip,
					callbacks: {
						title: (items: any[]) => format(new Date(items[0].parsed.x), 'd MMM yyyy'),
						label: (ctx: any) => {
							const s = ctx.raw?.sample
							if (!s) return ` ${ctx.dataset.label}`
							return ` VDOT ${s.vdot} — ${s.label}${s.source === 'race' ? ' (race)' : ''}`
						},
					},
				},
			},
			scales: {
				x: {
					type: 'time',
					time: { unit: 'month' },
					grid: { display: false },
					border: { display: false },
					ticks: { color: css('--text-muted'), font: { size: 10 }, maxRotation: 0 },
				},
				y: {
					...(baseOpts('VDOT') as any).scales.y,
					ticks: { color: css('--text-muted'), font: { size: 10 } },
				},
			},
		} as any,
	}))
}

function heatColor(day: any) {
	if (!day.value) return css('--surface-2')
	const intensity = Math.min(day.value / 3, 1)
	return `color-mix(in srgb, ${getSportColor('running')} ${Math.round((0.3 + intensity * 0.7) * 100)}%, transparent)`
}

function destroyCharts() { charts.forEach(c => c.destroy()); charts = [] }
function setMonthly() { isHeatmap.value = false; nextTick(buildMonthly) }

/**
 * Each builder no-ops when its canvas isn't mounted, so this only pays for the
 * charts the active tab actually renders.
 */
async function buildAll() {
	destroyCharts()
	await nextTick()

	if (tab.value === 'goals') {
		buildVdotTrend(); buildPredicted(); buildVO2()
	} else if (tab.value === 'trends') {
		buildDistance(); buildTonnage(); buildWeight(); buildMix()
		buildZones(); buildZoneDonut(); buildHeatmap()
		if (!isHeatmap.value) buildMonthly()
	}
}

async function load() {
	await hydrateSettings()
	const [w, dw, rg] = await Promise.all([db.getWorkouts(), db.getDailyWeights(), db.getRaceGoals()])
	workouts.value = w
	dailyWeights.value = dw
	raceGoals.value = rg
	// Imported FIT/GPX activities merged with Strava (when still connected)
	try {
		stravaActivities.value = await activityApi.getAllActivities()
		setActivities(stravaActivities.value) // share the fetch with the fitness store
	} catch {
		// No activity data — HR-based sections stay hidden
	}
	await buildAll()
}

watch(isHeatmap, v => { if (!v) nextTick(buildMonthly) })
watch(tab, () => { buildAll() })

onMounted(load)
onActivated(load)
onUnmounted(destroyCharts)
</script>

<style scoped>
.home-view { padding: 24px 28px 48px; max-width: 1120px; margin: 0 auto; width: 100%; box-sizing: border-box; }
@media (max-width: 768px) { .home-view { padding: 16px 16px 36px; } }

.home-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.greeting { font-size: 1.35rem; font-weight: 400; font-family: var(--font-serif); }
.subgreeting { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.85rem; }
.header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.streak-badge { display: inline-flex; align-items: center; gap: 6px; background: var(--warning-soft); color: var(--warning-color); padding: 7px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
.streak-badge .flame { animation: flame-pulse 2.6s ease-in-out infinite; }
@keyframes flame-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.22); } }

/* Tabs */
.tabbar { display: flex; gap: 2px; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); }
.tabbar button {
	background: transparent; border: none; border-bottom: 2px solid transparent;
	color: var(--text-muted); font-family: inherit; font-size: 0.88rem; font-weight: 500;
	padding: 9px 16px; cursor: pointer; transition: color 0.15s, border-color 0.15s;
}
.tabbar button:hover { color: var(--text-secondary); }
.tabbar button.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }

/* Today card */
.today-card { padding: 16px 18px; margin-bottom: 14px; }
.today-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.today-head h2 { font-size: 1rem; font-weight: 600; margin: 0; }
.today-status { font-size: 0.74rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
.today-status.done { color: var(--success-color); background: var(--success-soft); }
.today-status.rest { color: var(--text-muted); background: var(--surface-2); }
.today-rest-note { margin: 0; font-size: 0.85rem; color: var(--text-muted); }

.today-sessions { display: flex; flex-direction: column; gap: 10px; }
.today-session {
	display: flex; align-items: flex-start; gap: 11px;
	padding: 12px; background: var(--surface-2);
	border: 1px solid var(--border-color); border-radius: var(--radius-sm);
}
.today-session.done { opacity: 0.62; }
.ts-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
.ts-body { flex: 1; min-width: 0; }
.ts-top { display: flex; align-items: center; gap: 7px; }
.ts-name { font-weight: 600; font-size: 0.95rem; color: var(--text-color); text-decoration: none; }
.ts-name:hover { color: var(--primary-color); }
.ts-done { color: var(--success-color); font-weight: 700; }
.ts-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
.ts-pill {
	font-size: 0.74rem; color: var(--text-secondary); background: var(--surface-color);
	border: 1px solid var(--border-color); padding: 2px 9px; border-radius: 999px;
}
.ts-pill.pace { cursor: help; }
.ts-pill.pace.basis-fitness { color: var(--color-running-primary); border-color: color-mix(in srgb, var(--color-running-primary) 40%, transparent); }
.ts-pill.pace.basis-goal { color: var(--primary-color); border-color: var(--primary-soft); background: var(--primary-soft); }
.ts-pill.pace.basis-planned { color: var(--text-muted); font-family: inherit; }
.ts-steps { margin: 9px 0 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.ts-steps li { position: relative; padding-left: 15px; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; }
.ts-steps li::before { content: ''; position: absolute; left: 3px; top: 7px; width: 4px; height: 4px; border-radius: 50%; background: var(--text-muted); }
.ts-complete {
	background: var(--primary-color); color: #fff; border: none; border-radius: var(--radius-sm);
	padding: 7px 14px; font-family: inherit; font-size: 0.78rem; font-weight: 600;
	cursor: pointer; flex-shrink: 0; transition: opacity 0.15s;
}
.ts-complete:hover:not(:disabled) { opacity: 0.88; }
.ts-complete:disabled { opacity: 0.5; cursor: default; }

/* Fitness & freshness */
.form-badges { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.fb { display: flex; align-items: baseline; gap: 5px; font-size: 0.82rem; }
.fb-lbl { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.fb-verdict { font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
.fb-verdict.good { color: var(--success-color); background: var(--success-soft); }
.fb-verdict.warn { color: var(--warning-color); background: var(--warning-soft); }
.fb-verdict.bad { color: var(--danger-color); background: var(--danger-soft); }
.fb-verdict.neutral { color: var(--text-secondary); background: var(--surface-2); }
.form-foot { display: flex; flex-direction: column; gap: 2px; }
.race-ready strong { color: var(--text-color); }
.warn-note { color: var(--warning-color) !important; }

/* Goal tracker */
.goal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.goal-card { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.goal-card.aspirational { border-style: dashed; }
.goal-card.reached { border-color: color-mix(in srgb, var(--success-color) 45%, transparent); }
.gc-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.gc-name { font-weight: 600; font-size: 0.92rem; color: var(--text-color); }
.gc-when { font-size: 0.72rem; color: var(--text-secondary); white-space: nowrap; }
.gc-when.muted { color: var(--text-muted); }
.gc-target { font-size: 1.35rem; font-weight: 700; color: var(--text-color); line-height: 1; }
.gc-bar { position: relative; height: 6px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
.gc-bar-fill { height: 100%; background: var(--primary-color); border-radius: 999px; transition: width 0.3s ease; }
.goal-card.reached .gc-bar-fill { background: var(--success-color); }
.gc-vdots { display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted); }
.gc-verdict { margin: 2px 0 0; font-size: 0.78rem; line-height: 1.45; }
.gc-verdict.good { color: var(--success-color); }
.gc-verdict.off { color: var(--warning-color); }
.gc-verdict.muted { color: var(--text-muted); }
.goal-foot { display: flex; flex-direction: column; gap: 2px; margin-top: 10px; }

.form-calibrating { padding: 16px 18px; }
.form-calibrating p { margin: 0 0 6px; font-size: 0.86rem; color: var(--text-secondary); line-height: 1.55; }
.form-calibrating strong { color: var(--text-color); }

/* Predicted-vs-goal cards */
.predicted-grid { margin-top: 14px; }
.pr-goal { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }
.pr-delta { font-size: 0.7rem; font-weight: 600; margin-top: 3px; }
.pr-delta.good { color: var(--success-color); }
.pr-delta.off { color: var(--warning-color); }

/* Race hero */
.hero {
	background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color) 9%, var(--surface-color)), var(--surface-color) 60%);
	border: 1px solid var(--border-strong); border-radius: var(--radius-lg);
	padding: 24px 28px 20px; margin-bottom: 16px;
	box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 12px rgba(0,0,0,0.3);
}
.hero.urgent { border-color: rgba(239, 68, 68, 0.4); }
.hero-main { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
.hero-kicker { display: inline-flex; align-items: center; gap: 6px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-weight: 600; }
.hero-race { font-size: 1.9rem; font-weight: 400; font-family: var(--font-serif); margin: 6px 0 0; line-height: 1.15; }
.hero-sub { margin: 6px 0 0; color: var(--text-secondary); font-size: 0.88rem; }
.hero-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.hero-chip { display: inline-flex; align-items: center; gap: 7px; background: var(--surface-2); border: 1px solid var(--border-color); border-radius: 999px; padding: 5px 12px; font-size: 0.85rem; }
.hero-chip .hc-lbl { color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; }
.hero-chip .mono { font-weight: 700; }
.hero-chip.good { background: var(--success-soft); color: var(--success-color); border-color: transparent; font-weight: 600; }
.hero-chip.warn { background: var(--warning-soft); color: var(--warning-color); border-color: transparent; font-weight: 600; }
.hero-count { text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
.hero-days { font-size: 3.2rem; font-weight: 700; line-height: 1; color: var(--primary-color); }
.hero.urgent .hero-days { color: var(--danger-color); }
.hero-days-lbl { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
.hero-weeks { font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; }
.hero-bar { margin-top: 20px; }
.hb-track { display: flex; gap: 3px; height: 8px; }
.hb-seg { flex: 1; border-radius: 3px; background: var(--surface-2); transition: background 0.3s ease; }
.hb-seg.done { background: color-mix(in srgb, var(--success-color) 55%, var(--surface-2)); }
.hb-seg.cur { background: var(--primary-color); box-shadow: 0 0 8px var(--glow-color); }
.hb-seg.taper:not(.done):not(.cur) { background: color-mix(in srgb, var(--warning-color) 30%, var(--surface-2)); }
.hb-labels { display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted); margin-top: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
.hb-labels .hb-taper { color: var(--warning-color); }

/* PR banner */
.pr-banner { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: color-mix(in srgb, var(--warning-color) 10%, var(--surface-color)); border: 1px solid color-mix(in srgb, var(--warning-color) 35%, transparent); border-radius: var(--radius); padding: 10px 16px; margin-bottom: 16px; }
.pr-banner-ico { color: var(--warning-color); font-size: 1.2rem; display: inline-flex; animation: flame-pulse 2.6s ease-in-out infinite; }
.pr-banner-chip { font-size: 0.85rem; font-weight: 600; color: var(--text-color); }
.pr-banner-chip + .pr-banner-chip { border-left: 1px solid var(--border-strong); padding-left: 10px; }

/* Entrance motion */
.rise, .metric-card, .panel { animation: fade-up 0.45s ease both; }
.metric-card:nth-child(2) { animation-delay: 0.05s; }
.metric-card:nth-child(3) { animation-delay: 0.1s; }
.metric-card:nth-child(4) { animation-delay: 0.15s; }
.metric-card:nth-child(5) { animation-delay: 0.2s; }
@keyframes fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
	.rise, .metric-card, .panel, .streak-badge .flame, .pr-banner-ico { animation: none; }
}
.primary-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--primary-color); color: #fff; padding: 9px 16px; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; transition: background 0.15s; }
.primary-btn:hover { background: var(--primary-strong); }

.section-head { display: flex; align-items: baseline; gap: 12px; margin: 32px 2px 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color); }
.section-head h2 { font-size: 1.05rem; font-weight: 400; font-family: var(--font-serif); letter-spacing: 0; }
.section-note { color: var(--text-muted); font-size: 0.75rem; margin-left: auto; }

/* Metric cards */
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 16px; }
@media (max-width: 480px) { .metric-grid { grid-template-columns: 1fr; } }
.metric-card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 16px 18px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.3); display: flex; flex-direction: column; }
.metric-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.metric-label { color: var(--text-secondary); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
.metric-ico { color: var(--text-muted); font-size: 1.2rem; }
.metric-ico.run { color: var(--color-running-primary); }
.metric-ico.gym { color: var(--color-gym-primary); }
.metric-value { font-size: 1.9rem; font-weight: 700; line-height: 1; }
.metric-value.good { color: var(--color-running-primary); }
.metric-value .unit { font-size: 0.9rem; font-weight: 500; color: var(--text-secondary); }
.metric-sub { margin-top: 8px; font-size: 0.78rem; }
.metric-sub.up { color: var(--success-color); font-weight: 600; }
.metric-sub.down { color: var(--danger-color); font-weight: 600; }
.metric-sub.muted, .muted { color: var(--text-muted); }
.spark { display: flex; align-items: flex-end; gap: 3px; height: 26px; margin-top: auto; padding-top: 12px; }
.spark-bar { flex: 1; border-radius: 2px; background: color-mix(in srgb, var(--color-running-primary) 32%, var(--surface-2)); transition: height 0.5s ease; min-height: 2px; }
.spark-bar.last { background: var(--color-running-primary); }
.spark-bar.gym { background: color-mix(in srgb, var(--color-gym-primary) 32%, var(--surface-2)); }
.spark-bar.gym.last { background: var(--color-gym-primary); }
.progress-track { margin-top: 12px; height: 6px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.progress-fill { height: 100%; background: var(--primary-color); border-radius: 999px; transition: width 0.6s ease; }

/* Plan progress */
.plan-grid { display: grid; grid-template-columns: 230px 1fr; gap: 14px; }
@media (max-width: 768px) { .plan-grid { grid-template-columns: 1fr; } }
.plan-ring-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.ring-wrap { position: relative; width: 132px; height: 132px; }
.ring { width: 132px; height: 132px; transform: none; }
.ring-bg { stroke: var(--surface-2); }
.ring-fg { stroke: var(--primary-color); transition: stroke-dasharray 0.5s ease; }
.ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ring-pct { font-size: 1.65rem; font-weight: 700; color: var(--text-color); line-height: 1; }
.ring-lbl { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; }
.plan-ring-foot { font-size: 0.82rem; color: var(--text-secondary); text-align: center; }
.plan-stats-card { display: flex; flex-direction: column; gap: 18px; justify-content: center; }
.plan-stat-row { display: flex; gap: 22px; }
.plan-stat { flex: 1; }
.ps-label { font-size: 0.76rem; color: var(--text-secondary); }
.ps-val { display: block; font-size: 1.35rem; font-weight: 700; margin: 3px 0 9px; }
.ps-of { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; margin-left: 5px; }
.progress-fill.run { background: var(--color-running-primary); }
.ph-title { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.ph-bars { display: flex; gap: 6px; margin-top: 12px; align-items: flex-end; }
.ph-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.ph-bar-track { width: 100%; height: 56px; background: var(--surface-2); border-radius: 4px; display: flex; align-items: flex-end; overflow: hidden; }
.ph-bar-fill { width: 100%; background: var(--primary-color); border-radius: 4px 4px 0 0; min-height: 2px; transition: height 0.3s ease; }
.ph-bar-fill.full { background: var(--success-color); }
.ph-x { font-size: 0.62rem; color: var(--text-muted); }

/* Race time projection */
.pred-badges { display: flex; gap: 8px; flex-wrap: wrap; }
.pt-badge { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px solid var(--border-color); border-radius: 999px; padding: 4px 11px; font-size: 0.82rem; color: var(--text-color); }
.pt-badge .pt-lbl { color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; }
.pt-badge.good { background: var(--success-soft); color: var(--success-color); border-color: transparent; }
.pt-badge.off { background: var(--warning-soft); color: var(--warning-color); border-color: transparent; }

.panel { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 18px 20px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 4px rgba(0,0,0,0.25); }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.panel-head h2 { font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 7px; }
.text-link { color: var(--primary-color); font-size: 0.82rem; font-weight: 500; }

.week-strip { display: flex; gap: 8px; }
.day-col { flex: 1; text-align: center; text-decoration: none; }
.day-name { display: block; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
.day-col.today .day-name { color: var(--primary-color); font-weight: 700; }
.day-box { min-height: 72px; border-radius: var(--radius-sm); background: var(--surface-2); border: 1px solid transparent; padding: 6px 4px; display: flex; flex-direction: column; gap: 4px; transition: border-color 0.15s, transform 0.15s; }
.day-col.today .day-box { border-color: var(--primary-color); box-shadow: 0 0 10px var(--glow-color); }
.day-col:hover .day-box { border-color: var(--border-strong); transform: translateY(-2px); }
.day-chip { font-size: 0.68rem; font-weight: 600; padding: 4px 4px; border-radius: 4px; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.day-chip.done { background: var(--c); color: #0b0e14; }
.day-empty { color: var(--text-muted); margin: auto; }
.race-empty { color: var(--text-secondary); font-size: 0.88rem; }

/* Recent activities */
.recent-panel { padding: 6px 8px; }
.recent-row { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: var(--radius-sm); text-decoration: none; color: var(--text-color); transition: background 0.15s; }
.recent-row:hover { background: var(--surface-2); }
.recent-row + .recent-row { border-top: 1px solid var(--border-color); }
.recent-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.recent-name { font-weight: 500; font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent-date { color: var(--text-muted); font-size: 0.78rem; margin-left: auto; white-space: nowrap; }
.recent-stat { font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); min-width: 64px; text-align: right; }
.recent-chev { color: var(--text-muted); font-size: 1.1rem; flex-shrink: 0; }
.recent-empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem; }

/* Charts */
.chart-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 768px) { .chart-grid { grid-template-columns: 1fr; } }
.chart-card { padding: 16px 18px; }
.chart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 10px; flex-wrap: wrap; }
.chart-head h3 { font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.note { color: var(--text-muted); font-size: 0.75rem; }
.chart-body { height: 200px; position: relative; }
.chart-body.monthly { height: 300px; }
.heatmap-card { margin-top: 14px; }
.zone-section { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
@media (max-width: 768px) { .zone-section { grid-template-columns: 1fr; } }

.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.dot.gym { background: var(--color-gym-primary); }
.dot.weight { background: var(--primary-color); }

.seg { display: flex; gap: 4px; background: var(--surface-2); padding: 3px; border-radius: var(--radius-sm); }
.seg button { background: transparent; border: none; color: var(--text-secondary); padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 500; font-family: var(--font-family); }
.seg button.active { background: var(--primary-color); color: #fff; }

.heatmap-wrap { display: flex; flex-direction: column; gap: 12px; }
.heatmap { display: flex; gap: 3px; overflow-x: auto; padding-bottom: 4px; }
.hm-days { display: flex; flex-direction: column; gap: 3px; padding-top: 18px; }
.hm-days span { height: 11px; font-size: 8px; line-height: 11px; color: var(--text-muted); text-align: right; padding-right: 5px; }
.hm-weeks { display: flex; gap: 3px; }
.hm-col { display: flex; flex-direction: column; gap: 3px; }
.hm-month { height: 14px; font-size: 9px; color: var(--text-secondary); }
.hm-cell { width: 11px; height: 11px; border-radius: 2px; transition: transform 0.1s; }
.hm-cell:hover { transform: scale(1.4); outline: 1px solid var(--text-color); }
.hm-legend { display: flex; align-items: center; gap: 5px; font-size: 0.7rem; color: var(--text-muted); justify-content: flex-end; }
.hm-legend i { width: 11px; height: 11px; border-radius: 2px; background: var(--color-running-primary); display: inline-block; }

/* PRs */
.pr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 900px) { .pr-grid { grid-template-columns: repeat(2, 1fr); } }
.pr-card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.25); }
.pr-label { color: var(--text-secondary); font-size: 0.8rem; display: flex; align-items: center; gap: 6px; }
.pr-value { font-size: 1.3rem; font-weight: 700; }
/* Provenance: which activity set the record, so a wrong one is obvious. */
.pr-prov { font-size: 0.68rem; color: var(--text-secondary); margin-top: -4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pr-prov.muted { color: var(--text-muted); }

/* Projections */
.pred-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 600px) { .pred-grid { grid-template-columns: 1fr; } }
.pred-card { display: flex; align-items: flex-start; gap: 14px; padding: 16px 18px; }
.pred-icon { font-size: 1.4rem; color: var(--text-muted); padding-top: 2px; flex-shrink: 0; }
.pred-icon.run { color: var(--color-running-primary); }
.pred-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pred-label { color: var(--text-secondary); font-size: 0.8rem; }
.pred-main { display: flex; align-items: baseline; gap: 8px; }
.pred-main .mono { font-size: 1.5rem; font-weight: 700; line-height: 1; }
.pred-main .unit { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); }
.pred-timeframe { font-size: 0.78rem; color: var(--text-muted); }
.pred-trend { font-size: 0.78rem; color: var(--text-muted); }
.pred-trend.pos { color: var(--success-color); }
.pred-trend.neg { color: var(--danger-color); }

/* VO2 max */
.vo2-card { }
.vo2-badge-row { display: flex; flex-wrap: wrap; gap: 8px; }
.vo2-badge {
	display: inline-flex; align-items: center; gap: 6px;
	background: var(--surface-2); border: 1px solid var(--border-color);
	border-radius: var(--radius-sm); padding: 5px 10px; font-size: 0.8rem;
}
.vo2-badge-label { color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; }
.vo2-badge .mono { font-size: 1.05rem; font-weight: 700; }
.vo2-badge-unit { color: var(--text-muted); font-size: 0.72rem; }
.vo2-zone-chip { font-size: 0.72rem; font-weight: 600; margin-left: 2px; }
.vo2-chart-body { height: 220px; position: relative; margin-top: 14px; }
.vo2-note { margin: 12px 0 0; font-size: 0.72rem; color: var(--text-muted); line-height: 1.5; }
</style>
