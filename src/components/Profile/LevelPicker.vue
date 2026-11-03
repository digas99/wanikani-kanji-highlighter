<template>
	<Transition name="level-picker">
		<div v-if="open" class="level-picker" @click.self="$emit('close')">
			<div class="level-picker-card" role="dialog" aria-label="Go to level">
				<header class="level-picker-head">
					<span class="level-picker-title">Go to level</span>
					<button type="button" class="level-picker-close" title="Close (Esc)" @click="$emit('close')">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
					</button>
				</header>

				<!-- one row per WaniKani section of ten levels -->
				<div v-for="section in sections" :key="section.start" class="level-picker-row">
					<span class="level-picker-section" :title="`${section.name}: levels ${section.start}–${section.start + 9}`">
						{{ section.kanji }}
					</span>
					<div class="level-picker-grid">
						<button
							v-for="level in section.levels"
							:key="level.value"
							type="button"
							class="level-picker-level"
							:class="[level.status, { selected: level.value === selectedLevel }]"
							:disabled="level.status === 'locked'"
							:title="level.title"
							@click="$emit('select', level.value)"
						>
							<span>{{ level.value }}</span>
							<svg v-if="level.status === 'burned'" class="level-picker-flame" viewBox="4 1 16 22" aria-hidden="true">
								<path d="M12 1.5c.6 3.2 2.6 5 4.2 7.1A7.6 7.6 0 0 1 18 13.5 6 6 0 0 1 12 22a6 6 0 0 1-6-6c0-2.3 1-4 2.3-5.3.1 1.6.9 2.7 2 3-.7-3.4.5-7.3 1.7-12.2z" />
							</svg>
							<span v-if="level.progress != null" class="level-picker-progress" :style="{ width: `${level.progress}%` }"></span>
						</button>
					</div>
				</div>

				<footer class="level-picker-legend">
					<span><span class="swatch burned"></span>Burned</span>
					<span title="The line at the bottom of a passed level: how much of it is burned"><span class="swatch passed"></span>Passed</span>
					<span><span class="swatch current"></span>Current</span>
					<span><span class="swatch future"></span>Upcoming</span>
				</footer>
			</div>
		</div>
	</Transition>
</template>

<script>
const SECTIONS = [
	{ kanji: '快', name: 'Pleasant' },
	{ kanji: '苦', name: 'Painful' },
	{ kanji: '死', name: 'Death' },
	{ kanji: '地獄', name: 'Hell' },
	{ kanji: '天国', name: 'Paradise' },
	{ kanji: '現実', name: 'Reality' },
];

export default {
	name: 'LevelPicker',

	props: {
		open: Boolean,
		/** Level the profile is showing right now. */
		selectedLevel: { type: Number, default: null },
		/** The user's WaniKani level. */
		userLevel: { type: Number, default: null },
		/** Highest level the subscription allows. */
		maxLevel: { type: Number, default: 60 },
		/** level → share of its subjects passed (0–100), for the small bars. */
		progressByLevel: { type: Object, default: () => ({}) },
		/** level → share of its subjects burned (0–100). */
		burnByLevel: { type: Object, default: () => ({}) },
	},

	emits: ['select', 'close'],

	computed: {
		sections() {
			return SECTIONS.map((section, index) => {
				const start = index * 10 + 1;
				return {
					...section,
					start,
					levels: Array.from({ length: 10 }, (_, offset) => this.levelInfo(start + offset)),
				};
			});
		},
	},

	watch: {
		open(isOpen) {
			if (isOpen) document.addEventListener('keydown', this.onKeydown);
			else document.removeEventListener('keydown', this.onKeydown);
		},
	},

	beforeUnmount() {
		document.removeEventListener('keydown', this.onKeydown);
	},

	methods: {
		levelInfo(value) {
			const user = this.userLevel ?? 0;
			let status = 'future';
			if (value > this.maxLevel) status = 'locked';
			else if (value < user) status = 'passed';
			else if (value === user) status = 'current';

			const progress = this.progressByLevel[value];
			const burn = this.burnByLevel[value] ?? 0;
			if (status === 'passed' && burn >= 100) status = 'burned';
			const label = {
				burned: 'All burned',
				passed: 'Passed',
				current: 'Your current level',
				future: 'Upcoming',
				locked: 'Not included in your subscription',
			}[status];
			// passed levels are all (nearly) passed: their bar shows what's burned instead
			let bar = null;
			if (status === 'passed') bar = burn;
			else if (status === 'current' || status === 'future') bar = progress ?? null;
			const parts = [`Level ${value}`, label];
			if (progress != null && status !== 'locked' && status !== 'burned') parts.push(`${Math.round(progress)}% passed`);
			if (status === 'passed' || status === 'current') parts.push(`${Math.round(burn)}% burned`);
			return {
				value,
				status,
				progress: bar,
				title: parts.join(' · '),
			};
		},
		onKeydown(event) {
			if (event.key === 'Escape') this.$emit('close');
		},
	},
};
</script>

<style scoped>
.level-picker {
	position: fixed;
	top: 0;
	bottom: 0;
	left: var(--frame-left, 0px);
	width: var(--content-width, 100%);
	z-index: 50;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 12px;
	box-sizing: border-box;
	background: rgba(10, 11, 22, 0.6);
}

.level-picker-card {
	width: 100%;
	padding: 12px;
	border-radius: var(--card-radius, 12px);
	border: 1px solid var(--surface-border-color);
	background: var(--fill-color);
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.level-picker-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.level-picker-title {
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-size: 11.5px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.level-picker-close {
	display: flex;
	padding: 4px;
	border: none;
	border-radius: 6px;
	background: transparent;
	cursor: pointer;
}

.level-picker-close:hover {
	background: var(--surface-muted-color);
}

.level-picker-close svg {
	width: 16px;
	height: 16px;
	fill: none;
	stroke: var(--font-sec-color);
	stroke-width: 2.5;
	stroke-linecap: round;
}

.level-picker-row {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 4px;
}

.level-picker-section {
	flex-shrink: 0;
	width: 30px;
	font-size: 12px;
	font-weight: 700;
	text-align: center;
	color: var(--font-sec-color);
	white-space: nowrap;
}

.level-picker-grid {
	flex: 1;
	display: grid;
	grid-template-columns: repeat(10, 1fr);
	gap: 4px;
}

.level-picker-level {
	position: relative;
	height: 32px;
	padding: 0;
	border: none;
	border-radius: 7px;
	overflow: hidden;
	font-family: inherit;
	font-size: 12.5px;
	font-weight: 700;
	cursor: pointer;
	transition: transform 0.12s ease, filter 0.12s ease;
}

.level-picker-level:hover:not(:disabled) {
	transform: translateY(-1px);
	filter: brightness(1.1);
}

.level-picker-level.passed {
	background: var(--wanikani);
	color: #fff;
}

/* every subject burned: red, a small flame in the corner */
.level-picker-level.burned {
	background: #e20000;
	color: #fff;
}

.level-picker-flame {
	position: absolute;
	top: 3px;
	right: 3px;
	width: 6px;
	height: 8px;
	fill: #fff;
	opacity: 0.9;
}

.level-picker-level.current {
	background: var(--wanikani-sec);
	color: #fff;
}

.level-picker-level.future {
	background: var(--surface-muted-color);
	color: var(--font-sec-color);
}

.level-picker-level.locked {
	background: var(--surface-muted-color);
	color: var(--font-sec-color);
	opacity: 0.4;
	cursor: not-allowed;
}

/* the level the profile is showing */
.level-picker-level.selected {
	box-shadow: inset 0 0 0 2px var(--heading-color, #2a2d48);
}

.level-picker-progress {
	display: block;
	position: absolute;
	left: 0;
	bottom: 0;
	height: 3px;
	background: rgba(255, 255, 255, 0.85);
}

.level-picker-level.future .level-picker-progress {
	background: var(--wanikani);
}

.level-picker-legend {
	display: flex;
	justify-content: center;
	gap: 14px;
	margin-top: 8px;
	font-size: 11px;
	color: var(--font-sec-color);
}

.level-picker-legend > span {
	display: flex;
	align-items: center;
	gap: 5px;
}

.level-picker-legend .swatch {
	display: block;
	width: 10px;
	height: 10px;
	border-radius: 3px;
}

.level-picker-legend .swatch.burned { background: #e20000; }
.level-picker-legend .swatch.passed { background: var(--wanikani); }
.level-picker-legend .swatch.current { background: var(--wanikani-sec); }
.level-picker-legend .swatch.future { background: var(--surface-muted-color); border: 1px solid var(--surface-border-color); }

.level-picker-enter-active,
.level-picker-leave-active {
	transition: opacity 0.18s ease;
}

.level-picker-enter-active .level-picker-card,
.level-picker-leave-active .level-picker-card {
	transition: transform 0.2s ease;
}

.level-picker-enter-from,
.level-picker-leave-to {
	opacity: 0;
}

.level-picker-enter-from .level-picker-card,
.level-picker-leave-to .level-picker-card {
	transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
	.level-picker-enter-active,
	.level-picker-leave-active,
	.level-picker-enter-active .level-picker-card,
	.level-picker-leave-active .level-picker-card,
	.level-picker-level {
		transition: none;
	}
}
</style>
