<template>
	<div class="overview-view-wrapper">
		<div class="overview-view glitch-alive">
			<div class="system-monitor-overlay">
				<div class="status-line"><span class="prompt">_STAT:</span> [KERNEL_ACTIVE] <span class="blink">●</span></div>
				<div class="status-line"><span class="prompt">_UPLINK:</span> [SYNC_READY]</div>
				<div class="status-line log-stream">{{ currentLog }}</div>
			</div>

			<section class="metrics-grid">
				<div class="chart-card dist-sys">
					<div class="chart-title">_SYS.DISTRIBUTION</div>
					<div class="chart-content">
						<canvas ref="workoutTypeChartCanvas"></canvas>
					</div>
					<div v-if="isProcessing" class="card-loader">ANALYZING...</div>
				</div>
				<div class="chart-card mass-metrics">
					<div class="chart-title">_MASS.METRICS</div>
					<div class="chart-content">
						<canvas ref="dailyWeightChartCanvas"></canvas>
					</div>
					<div v-if="isProcessing" class="card-loader">SCANNING...</div>
				</div>
				<div class="chart-card load-logs">
					<div class="chart-title">_LOAD.LOGS</div>
					<div class="chart-content">
						<canvas ref="weeklyWeightChartCanvas"></canvas>
					</div>
					<div v-if="isProcessing" class="card-loader">FETCHING...</div>
				</div>
				<div class="chart-card dist-vectors">
					<div class="chart-title">_DIST.VECTORS</div>
					<div class="chart-content">
						<canvas ref="weeklyRunningChartCanvas"></canvas>
					</div>
					<div v-if="isProcessing" class="card-loader">MAPPING...</div>
				</div>
			</section>

			<section class="workout-overview-section full-width">
				<div class="overview-header">
					<h2 class="overview-title">
						<span class="prompt">></span> {{ isWeeklyView ? 'ANNUAL_ACTIVITY_MAP' : 'MONTHLY_DATA_STREAM' }}
					</h2>
					<div class="view-toggle">
						<button @click="isWeeklyView = true" :class="{ 'active': isWeeklyView }" class="toggle-button">_HEATMAP</button>
						<button @click="isWeeklyView = false" :class="{ 'active': !isWeeklyView }" class="toggle-button">_BAR_CHART</button>
					</div>
				</div>
				
				<div v-show="isWeeklyView" class="heatmap-wrapper">
					<div class="heatmap-container">
						<div class="days-labels">
							<div class="day-label corner"></div>
							<div v-for="day in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="day" class="day-label">
								{{ day }}
							</div>
						</div>
						<div class="weeks-container">
							<div v-for="(week, weekIndex) in heatmapWeeks" :key="weekIndex" class="heatmap-column">
								<div class="month-label">{{ week.monthLabel }}</div>
								<div 
									v-for="(day, dayIndex) in week.days" 
									:key="dayIndex" 
									class="heatmap-cell" 
									:class="{ 'has-value': day.value > 0 }"
									:style="{ backgroundColor: getHeatmapColor(day) }"
									:title="`Date: ${day.dateStr}, Workouts: ${day.value || 0}${day.types?.length ? '\nTypes: ' + day.types.join(', ').toUpperCase() : ''}`"
								>
								</div>
							</div>
						</div>
					</div>
					<div class="heatmap-legend">
						<span>NULL</span>
						<div class="legend-scale">
							<div title="Gym" style="background-color: rgba(63, 136, 197, 0.6)"></div>
							<div title="Running" style="background-color: rgba(92, 184, 92, 0.6)"></div>
							<div title="Other" style="background-color: rgba(255, 167, 38, 0.6)"></div>
							<div title="Rest" style="background-color: rgba(117, 117, 117, 0.6)"></div>
						</div>
						<span>PEAK</span>
					</div>
				</div>
				<div v-show="!isWeeklyView" class="monthly-chart-container">
					<canvas ref="monthlyChartCanvas"></canvas>
				</div>
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onActivated } from 'vue';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { format, addMonths, subWeeks, startOfWeek, parseISO, addWeeks, addDays, subYears, endOfWeek, isSameMonth } from 'date-fns';
import { db } from '@/db';
import type { Workout, DailyWeight } from '../types';

// Terminal Style Chart Defaults
Chart.defaults.font.family = "'Fira Code', monospace";
Chart.defaults.color = '#00b33c';
Chart.defaults.borderColor = 'rgba(0, 179, 60, 0.1)';

const isWeeklyView = ref(true);
const isProcessing = ref(true);
const currentLog = ref("INITIALIZING...");
const allWorkouts = ref<Workout[]>([]);
const dailyWeights = ref<DailyWeight[]>([]);
const heatmapWeeks = ref<any[]>([]);

const WORKOUT_TYPES = ['gym', 'running', 'rest', 'other'];

const COLOR_PALETTE: { [key: string]: { background: string; border: string; highlight: string } } = {
	gym: {
		background: 'rgba(63, 136, 197, 0.4)',
		border: '#3f88c5',
		highlight: 'rgba(63, 136, 197, 0.8)'
	},
	running: {
		background: 'rgba(0, 179, 60, 0.4)',
		border: '#00b33c',
		highlight: 'rgba(0, 179, 60, 0.8)'
	},
	rest: {
		background: 'rgba(117, 117, 117, 0.4)',
		border: '#757575',
		highlight: 'rgba(117, 117, 117, 0.8)'
	},
	other: {
		background: 'rgba(255, 167, 38, 0.4)',
		border: '#FFA726',
		highlight: 'rgba(255, 167, 38, 0.8)'
	},
};

const monthlyChartCanvas = ref<HTMLCanvasElement | null>(null);
const workoutTypeChartCanvas = ref<HTMLCanvasElement | null>(null);
const weeklyWeightChartCanvas = ref<HTMLCanvasElement | null>(null);
const weeklyRunningChartCanvas = ref<HTMLCanvasElement | null>(null);
const dailyWeightChartCanvas = ref<HTMLCanvasElement | null>(null);

let monthlyChartInstance: Chart | null = null;
let workoutTypeChartInstance: Chart | null = null;
let weeklyWeightChartInstance: Chart | null = null;
let weeklyRunningChartInstance: Chart | null = null;
let dailyWeightChartInstance: Chart | null = null;

const createChartOptions = (chartType: 'line' | 'bar' | 'pie', yAxisText?: string) => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: chartType === 'pie',
                position: 'bottom' as const,
                labels: { color: '#00b33c', boxWidth: 10, font: { size: 10 } }
            },
            tooltip: {
                backgroundColor: '#050505',
                borderColor: '#00b33c',
                borderWidth: 1,
                titleColor: '#00b33c',
                bodyColor: '#ffffff',
                cornerRadius: 0
            }
        },
        scales: chartType === 'pie' ? {} : {
            x: {
                ticks: { color: '#008f11', font: { size: 10 } },
                grid: { color: 'rgba(0, 179, 60, 0.05)' },
            },
            y: {
                ticks: { color: '#008f11', font: { size: 10 } },
                grid: { color: 'rgba(0, 179, 60, 0.05)' },
                title: {
                    display: !!yAxisText,
                    text: yAxisText,
                    color: '#00b33c',
                    font: { size: 12 }
                }
            },
        },
    };
};

const getWorkoutType = (workout: Workout): 'gym' | 'running' | 'rest' | 'other' => {
	if (workout.type) {
		const typeLower = workout.type.toLowerCase();
		if (typeLower === 'gym') return 'gym';
		if (typeLower === 'running') return 'running';
		if (typeLower === 'rest day' || typeLower === 'rest') return 'rest';
	}
	const nameLower = workout.name.toLowerCase();
	if (nameLower.includes('gym') || nameLower.includes('strength')) return 'gym';
	if (nameLower.includes('run') || nameLower.includes('running')) return 'running';
	return 'other';
};

const createHeatmapData = (allWorkouts: Workout[]) => {
	const today = new Date();
	const startDate = startOfWeek(subYears(today, 1), { weekStartsOn: 1 });
	const endDate = endOfWeek(today, { weekStartsOn: 1 });

	const dayData: { [date: string]: { count: number, types: string[] } } = {};
	allWorkouts.filter(w => w.isCompleted === 1).forEach(w => {
		const d = format(parseISO(w.date), 'yyyy-MM-dd');
		if (!dayData[d]) dayData[d] = { count: 0, types: [] };
		dayData[d].count += 1;
		dayData[d].types.push(getWorkoutType(w));
	});

	const weeks = [];
	let currentWeekStart = startDate;

	while (currentWeekStart <= endDate) {
		const days = [];
		for (let i = 0; i < 7; i++) {
			const d = addDays(currentWeekStart, i);
			const dStr = format(d, 'yyyy-MM-dd');
            const data = dayData[dStr] || { count: 0, types: [] };
			days.push({ 
                date: d, 
                dateStr: format(d, 'MMM d, yyyy'), 
                value: data.count,
                types: data.types
            });
		}
		const monthLabel = (currentWeekStart.getDate() <= 7) ? format(currentWeekStart, 'MMM') : '';
		weeks.push({ monthLabel, days });
		currentWeekStart = addWeeks(currentWeekStart, 1);
	}
	heatmapWeeks.value = weeks;
};

const getHeatmapColor = (day: any) => {
    if (!day.value) return 'rgba(0, 179, 60, 0.05)';

    // If there's only one type of workout, use its specific color
    if (day.types && day.types.length > 0) {
        const counts: { [key: string]: number } = {};
        day.types.forEach((t: string) => counts[t] = (counts[t] || 0) + 1);

        let maxType = day.types[0];
        let maxCount = 0;
        for (const type in counts) {
            if (counts[type] > maxCount) {
                maxCount = counts[type];
                maxType = type;
            }
        }

        const intensity = Math.min(day.value / 3, 1);
        const baseColor = COLOR_PALETTE[maxType]?.border || '#00b33c';

        // Convert hex to rgba for intensity
        if (baseColor.startsWith('#')) {
            const r = parseInt(baseColor.slice(1, 3), 16);
            const g = parseInt(baseColor.slice(3, 5), 16);
            const b = parseInt(baseColor.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.6})`;
        }
        return baseColor;
    }

    const intensity = Math.min(day.value / 3, 1);
    return `rgba(0, 179, 60, ${0.3 + intensity * 0.7})`;
};

const createWorkoutTypeChart = (allWorkouts: Workout[]) => {
	const data = WORKOUT_TYPES.map(t => allWorkouts.filter(w => w.isCompleted === 1 && getWorkoutType(w) === t).length);
	if (workoutTypeChartCanvas.value) {
		const ctx = workoutTypeChartCanvas.value.getContext('2d');
		if (ctx) {
			if (workoutTypeChartInstance) workoutTypeChartInstance.destroy();
			workoutTypeChartInstance = new Chart(ctx, {
				type: 'pie',
				data: {
					labels: WORKOUT_TYPES.map(t => t.toUpperCase()),
					datasets: [{
						data,
						backgroundColor: WORKOUT_TYPES.map(t => COLOR_PALETTE[t].background),
						borderColor: WORKOUT_TYPES.map(t => COLOR_PALETTE[t].border),
						borderWidth: 1
					}]
				},
				options: createChartOptions('pie')
			});
		}
	}
};

const createDailyWeightChart = (dailyWeights: DailyWeight[]) => {
    const sorted = [...dailyWeights].sort((a, b) => a.date.localeCompare(b.date));
    const goalWeightStr = localStorage.getItem('goalWeight');
    const goalWeight = goalWeightStr ? parseFloat(goalWeightStr) : null;

    if (dailyWeightChartCanvas.value) {
        const ctx = dailyWeightChartCanvas.value.getContext('2d');
        if (ctx) {
            if (dailyWeightChartInstance) dailyWeightChartInstance.destroy();

            const datasets: any[] = [{
                label: 'BODY_MASS',
                data: sorted.map(w => w.weight),
                borderColor: '#00b33c',
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4
            }];

            if (goalWeight !== null) {
                datasets.push({
                    label: 'GOAL',
                    data: sorted.map(() => goalWeight),
                    borderColor: '#ff4444',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                });
            }

            dailyWeightChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sorted.map(w => format(parseISO(w.date), 'dd/MM')),
                    datasets
                },
                options: createChartOptions('line', 'KG')
            });
        }
    }
};

const createWeeklyWeightChart = (allWorkouts: Workout[]) => {
    const weeks = [];
    for (let i = 9; i >= 0; i--) weeks.push(subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i));

    const data = weeks.map(w => {
        const wEnd = endOfWeek(w, { weekStartsOn: 1 });
        return allWorkouts
            .filter(wk => {
                const d = parseISO(wk.date);
                return wk.isCompleted === 1 && getWorkoutType(wk) === 'gym' && d >= w && d <= wEnd;
            })
            .reduce((sum, wk) => sum + (wk.totalWeightLifted || 0), 0);
    });

    if (weeklyWeightChartCanvas.value) {
        const ctx = weeklyWeightChartCanvas.value.getContext('2d');
        if (ctx) {
            if (weeklyWeightChartInstance) weeklyWeightChartInstance.destroy();
            weeklyWeightChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: weeks.map(w => format(w, 'dd/MM')),
                    datasets: [{
                        label: 'LOAD',
                        data,
                        backgroundColor: 'rgba(0, 179, 60, 0.2)',
                        borderColor: '#00b33c',
                        borderWidth: 1
                    }]
                },
                options: createChartOptions('bar', 'KG')
            });
        }
    }
};

const createWeeklyRunningChart = (allWorkouts: Workout[]) => {
    const weeks = [];
    for (let i = 9; i >= 0; i--) weeks.push(subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i));

    const data = weeks.map(w => {
        const wEnd = endOfWeek(w, { weekStartsOn: 1 });
        return allWorkouts
            .filter(wk => {
                const d = parseISO(wk.date);
                return wk.isCompleted === 1 && getWorkoutType(wk) === 'running' && d >= w && d <= wEnd;
            })
            .reduce((sum, wk) => sum + (wk.distance || 0), 0);
    });

    if (weeklyRunningChartCanvas.value) {
        const ctx = weeklyRunningChartCanvas.value.getContext('2d');
        if (ctx) {
            if (weeklyRunningChartInstance) weeklyRunningChartInstance.destroy();
            weeklyRunningChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: weeks.map(w => format(w, 'dd/MM')),
                    datasets: [{
                        label: 'DIST',
                        data,
                        borderColor: '#00b33c',
                        backgroundColor: 'rgba(0, 179, 60, 0.1)',
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: createChartOptions('line', 'KM')
            });
        }
    }
};

const createMonthlyWorkoutChart = (allWorkouts: Workout[]) => {
    const months = [];
    for (let i = 5; i >= 0; i--) months.push(addMonths(new Date(), -i));
    if (monthlyChartCanvas.value) {
        const ctx = monthlyChartCanvas.value.getContext('2d');
        if (ctx) {
            if (monthlyChartInstance) monthlyChartInstance.destroy();
            monthlyChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: months.map(m => format(m, 'MMM')),
                    datasets: WORKOUT_TYPES.map(t => ({
                        label: t.toUpperCase(),
                        data: months.map(m => allWorkouts.filter(w => w.isCompleted === 1 && getWorkoutType(w) === t && isSameMonth(parseISO(w.date), m)).length),
                        backgroundColor: COLOR_PALETTE[t].background
                    }))
                },
                options: {
                    ...createChartOptions('bar'),
                    scales: { x: { stacked: true }, y: { stacked: true } }
                }
            });
        }
    }
};

const logs = [
	"FETCHING_SQLITE_BUFFERS...",
	"PARSING_TEMPORAL_DATA...",
	"CALIBRATING_METRIC_AXES...",
	"GENERATING_HEATMAP_VECTORS...",
	"UPLINK_STABLE_RECEIVING...",
	"OPTIMIZING_CHART_DOM...",
	"SYS_MEMORY_CHECK_PASS",
	"DECODING_STRAVA_UPLINK..."
];

let logInterval: any = null;
const startLogStream = () => {
	if (logInterval) clearInterval(logInterval);
	logInterval = setInterval(() => {
		currentLog.value = logs[Math.floor(Math.random() * logs.length)];
	}, 3000);
};

async function fetchAndProcessData() {
    isProcessing.value = true;
    allWorkouts.value = await db.getWorkouts();
    dailyWeights.value = await db.getDailyWeights();

    // Wait for next tick to ensure canvas elements are ready
    await nextTick();

    createWorkoutTypeChart(allWorkouts.value);
    createDailyWeightChart(dailyWeights.value);
    createWeeklyWeightChart(allWorkouts.value);
    createWeeklyRunningChart(allWorkouts.value);
    createHeatmapData(allWorkouts.value);
    if (!isWeeklyView.value) createMonthlyWorkoutChart(allWorkouts.value);
    isProcessing.value = false;
}

onMounted(() => {
	fetchAndProcessData();
	startLogStream();
});

onActivated(() => {
	fetchAndProcessData();
	startLogStream();
});

import { onUnmounted } from 'vue';
onUnmounted(() => {
	if (logInterval) clearInterval(logInterval);
});

watch(isWeeklyView, (v) => { if (!v) nextTick(() => createMonthlyWorkoutChart(allWorkouts.value)); });

</script>

<style scoped>
.overview-view-wrapper {
	width: 100%;
    overflow-x: hidden;
}

.overview-view {
	padding: 16px;
	color: var(--text-color);
	font-family: var(--font-family);
    width: 100%;
    position: relative;
    box-sizing: border-box;
}

@media (min-width: 769px) {
    .overview-view {
        padding: 24px 32px;
    }
}

.system-monitor-overlay {
    position: absolute;
    top: 5px;
    right: 10px;
    text-align: right;
    font-size: 0.65rem;
    color: #008f11;
    z-index: 10;
    pointer-events: none;
    background: rgba(10, 10, 10, 0.8);
    padding: 4px 8px;
    border: 1px solid rgba(0, 179, 60, 0.1);
}

@media (max-width: 600px) {
    .system-monitor-overlay {
        position: static;
        text-align: left;
        margin-bottom: 20px;
        width: fit-content;
    }
}

.status-line {
    margin-bottom: 2px;
}

.log-stream {
    color: var(--accent-color);
    font-style: italic;
    min-width: 180px;
}

.blink {
    animation: blink 1s step-end infinite;
}

@keyframes blink {
    50% { opacity: 0; }
}

.card-loader {
    position: absolute;
    bottom: 8px;
    right: 8px;
    font-size: 0.6rem;
    color: var(--accent-color);
    letter-spacing: 1px;
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
}

.metrics-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 20px;
	margin-bottom: 24px;
}

@media (min-width: 769px) {
    .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

.chart-card {
	background-color: rgba(10, 10, 10, 0.7);
	border: 1px solid var(--border-color);
	padding: 24px 16px 16px;
	position: relative;
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
    min-width: 0;
}

.chart-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 179, 60, 0.1);
    border-color: var(--accent-color);
}

.chart-title {
	position: absolute;
	top: -10px;
	left: 10px;
	background-color: var(--background-color);
	padding: 0 8px;
	font-size: 0.7rem;
    font-weight: bold;
	color: var(--accent-color);
    letter-spacing: 2px;
    border: 1px solid var(--border-color);
}

.chart-content {
	height: 180px;
	width: 100%;
    position: relative;
    overflow: hidden;
}

.workout-overview-section {
	background-color: rgba(10, 10, 10, 0.7);
	border: 1px solid var(--border-color);
	padding: 20px;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
}

@media (min-width: 769px) {
    .workout-overview-section.full-width {
        grid-column: span 2;
    }
}

.overview-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
}

.overview-title {
	color: var(--accent-color);
	margin: 0;
	font-size: 0.9rem;
    letter-spacing: 2px;
}

.view-toggle {
	display: flex;
	gap: 4px;
}

.toggle-button {
	background: transparent;
	border: 1px solid var(--border-color);
	color: #008f11;
	padding: 4px 12px;
	cursor: pointer;
	font-size: 0.65rem;
    font-family: var(--font-family);
    transition: all 0.2s;
}

.toggle-button.active {
	background-color: var(--accent-color);
	color: var(--background-color);
    border-color: var(--accent-color);
}

/* Heatmap Styles */
.heatmap-wrapper {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.heatmap-container {
    display: flex;
    gap: 3px;
    padding: 12px;
    background-color: rgba(0,0,0,0.3);
    overflow-x: auto;
    border: 1px solid rgba(0, 179, 60, 0.1);
    width: 100%;
    box-sizing: border-box;
}

.days-labels {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-top: 18px;
}

.day-label {
    height: 10px;
    font-size: 8px;
    line-height: 10px;
    color: #008f11;
    text-align: right;
    padding-right: 6px;
}

.weeks-container {
    display: flex;
    gap: 3px;
}

.heatmap-column {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.month-label {
    height: 14px;
    font-size: 9px;
    color: #00b33c;
    margin-bottom: 4px;
    font-weight: bold;
}

.heatmap-cell {
    width: 10px;
    height: 10px;
    border-radius: 1px;
    transition: all 0.1s;
}

.heatmap-cell:hover {
    transform: scale(1.4);
    outline: 1px solid #fff;
    z-index: 100;
    box-shadow: 0 0 15px var(--accent-color);
    filter: brightness(1.5);
}

.heatmap-legend {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.65rem;
    color: #008f11;
    justify-content: flex-end;
}

.legend-scale {
    display: flex;
    gap: 3px;
}

.legend-scale div {
    width: 8px;
    height: 8px;
}

.monthly-chart-container {
    height: 300px;
    width: 100%;
    position: relative;
    overflow: hidden;
}

.prompt {
    color: var(--accent-color);
    margin-right: 8px;
    font-weight: bold;
}
</style>

