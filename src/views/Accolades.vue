<template>
	<div class="container accolades">
		<div class="accolades-stack">
			<!-- how far overall, the latest badge, and the one closest to unlocking -->
			<div class="accolades-hero">
				<div class="accolades-hero-top">
					<img v-if="latest" class="accolades-hero-badge" :src="latest.image" :alt="latest.title" :title="latest.title">
					<div class="accolades-hero-totals">
						<span class="accolades-hero-count"><b>{{ totals.unlocked }}</b> / {{ totals.total }}</span>
						<span class="accolades-hero-label">accolades unlocked · {{ overallPercent }}%</span>
						<div class="accolades-hero-bar">
							<div :style="{ width: `${overallPercent}%` }"></div>
						</div>
					</div>
				</div>
				<button v-if="closest" type="button" class="accolades-hero-next" @click="open(closest.milestone)">
					<img :src="closest.milestone.image" alt="">
					<span class="accolades-hero-next-text">
						<small>Closest next</small>
						<b>{{ closest.group.title }}: {{ closest.milestone.title }}</b>
					</span>
					<span class="accolades-hero-next-percent">{{ Math.floor(closest.group.progress.percentage) }}%</span>
				</button>
			</div>

			<!-- one card, a compact row per kind: what it is, how far to the next, the badges -->
			<div class="accolades-card">
				<section v-for="group in groups" :key="group.type" class="accolades-group" :style="{ '--group-color': group.color }">
					<header class="accolades-group-head" :title="group.description">
						<span class="accolades-group-dot"></span>
						<b class="accolades-group-title">{{ group.title }}</b>
						<span class="accolades-group-count">{{ group.unlockedCount }}/{{ group.milestones.length }}</span>
					</header>
					<div v-if="group.progress" class="accolades-group-progress">
						<div class="accolades-bar small">
							<div :style="{ width: `${group.progress.percentage}%` }"></div>
						</div>
						<span>{{ group.progress.text }}</span>
					</div>
					<div v-else-if="group.unlockedCount === group.milestones.length" class="accolades-group-progress done">
						All unlocked!
					</div>
					<ul class="accolades-badges">
						<li v-for="milestone in group.milestones" :key="milestone.id">
							<button
								type="button"
								:class="{ unlocked: milestone.unlocked }"
								:title="milestone.unlocked ? milestone.title : `${milestone.title} — ${milestone.requirement}`"
								@click="open(milestone)"
							>
								<img :src="milestone.image" :alt="milestone.title" />
							</button>
						</li>
					</ul>
				</section>
			</div>
		</div>

		<Transition name="accolade-popup">
			<div v-if="selected" class="accolade-popup" @click="close">
				<button
					v-if="selectedIndex > 0"
					type="button"
					class="accolade-popup-arrow arrow-prev"
					title="Previous"
					@click.stop="step(-1)"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
				</button>
				<div class="accolade-popup-badge" :class="{ locked: !selected.milestone.unlocked }">
					<img :src="selected.milestone.image" :alt="selected.milestone.title" />
					<small :style="{ color: selected.group.color }">{{ selected.group.title }}</small>
					<div>{{ selected.milestone.title }}</div>
					<p>{{ selected.milestone.requirement }}</p>
					<p class="accolade-popup-status">
						<template v-if="selected.milestone.unlocked">Unlocked ✓</template>
						<template v-else-if="isNext(selected) && selected.group.progress">{{ selected.group.progress.text }}</template>
						<template v-else>Locked</template>
					</p>
				</div>
				<button
					v-if="selectedIndex < allMilestones.length - 1"
					type="button"
					class="accolade-popup-arrow arrow-next"
					title="Next"
					@click.stop="step(1)"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
				</button>
			</div>
		</Transition>
	</div>
</template>

<script>
import { useAccolades } from '@/utils/scripts/useAccolades';

export default {
	name: 'Accolades',

	data() {
		return {
			/** the milestone's id (its badge is shown big) */
			selectedId: null,
		};
	},

	computed: {
		groups() {
			return useAccolades().groups.value;
		},
		totals() {
			return useAccolades().totals.value;
		},
		latest() {
			return useAccolades().latest.value;
		},
		overallPercent() {
			return this.totals.total ? Math.round((this.totals.unlocked / this.totals.total) * 100) : 0;
		},
		/**
		 * The locked badge with the most progress towards it (not a speed run: a fast best level
		 * isn't progress, the next level has to be faster still).
		 */
		closest() {
			let best = null;
			for (const group of this.groups) {
				const milestone = group.milestones.find(entry => !entry.unlocked);
				if (!milestone || !group.progress || group.type === 'speed') continue;
				if (!best || group.progress.percentage > best.group.progress.percentage) best = { group, milestone };
			}
			return best;
		},
		/** The popup's arrows walk through every badge, in page order. */
		allMilestones() {
			return this.groups.flatMap(group => group.milestones.map(milestone => ({ group, milestone })));
		},
		selectedIndex() {
			return this.allMilestones.findIndex(entry => entry.milestone.id === this.selectedId);
		},
		selected() {
			return this.allMilestones[this.selectedIndex] ?? null;
		},
	},

	mounted() {
		document.addEventListener('keydown', this.onKeydown);
	},

	beforeUnmount() {
		document.removeEventListener('keydown', this.onKeydown);
	},

	methods: {
		/** the first locked one of its kind: its group's progress is towards it */
		isNext({ group, milestone }) {
			return group.milestones.find(entry => !entry.unlocked)?.id === milestone.id;
		},
		open(milestone) {
			this.selectedId = milestone.id;
		},
		close() {
			this.selectedId = null;
		},
		step(direction) {
			const next = this.allMilestones[this.selectedIndex + direction];
			if (next) this.selectedId = next.milestone.id;
		},
		onKeydown(event) {
			if (!this.selected) return;
			if (event.key === 'ArrowLeft') this.step(-1);
			else if (event.key === 'ArrowRight') this.step(1);
			else if (event.key === 'Escape') this.close();
			else return;
			event.preventDefault();
		},
	},
};
</script>

<style scoped>
.container {
	display: flex;
	flex-direction: column;
}

.accolades-stack {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 12px 0 24px;
}

/* like Home's hero card */
.accolades-hero {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 14px;
	border-radius: var(--card-radius, 12px);
	border: 1px solid rgba(255, 255, 255, 0.06);
	background-color: var(--default-color);
	background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));
	box-shadow: 0 4px 16px var(--shadow-soft-color);
	color: #fff;
}

.accolades-hero-top {
	display: flex;
	align-items: center;
	gap: 14px;
}

.accolades-hero-badge {
	flex-shrink: 0;
	width: 62px;
	height: 62px;
	filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
}

.accolades-hero-totals {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.accolades-hero-count {
	font-size: 15px;
	color: #c4c6da;
	line-height: 1.1;
}

.accolades-hero-count b {
	font-size: 28px;
	color: #fff;
}

.accolades-hero-label {
	font-size: 11.5px;
	color: #c4c6da;
}

.accolades-hero-bar {
	height: 7px;
	margin-top: 4px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.12);
	overflow: hidden;
}

.accolades-hero-bar > div {
	height: 100%;
	border-radius: inherit;
	background: linear-gradient(90deg, var(--wanikani-sec), var(--wanikani));
	transition: width 0.6s ease;
}

.accolades-hero-next {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 7px 12px 7px 8px;
	border: none;
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.07);
	color: #fff;
	font-family: inherit;
	text-align: left;
	cursor: pointer;
	transition: background-color 0.15s;
}

.accolades-hero-next:hover {
	background: rgba(255, 255, 255, 0.12);
}

.accolades-hero-next img {
	flex-shrink: 0;
	width: 30px;
	height: 30px;
	filter: grayscale(0.6);
	opacity: 0.8;
}

.accolades-hero-next-text {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	line-height: 1.3;
}

.accolades-hero-next-text small {
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: #b3b6cc;
}

.accolades-hero-next-text b {
	font-size: 12.5px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.accolades-hero-next-percent {
	font-size: 15px;
	font-weight: 800;
	color: var(--wanikani-sec);
}

.accolades-bar {
	height: 6px;
	border-radius: 999px;
	background: var(--surface-muted-color);
	overflow: hidden;
}

.accolades-bar > div {
	height: 100%;
	border-radius: inherit;
	background: var(--group-color, var(--wanikani));
	transition: width 0.6s ease;
}

.accolades-bar.small {
	flex: 0 0 64px;
	height: 5px;
}

.accolades-card {
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: var(--card-radius, 12px);
	box-shadow: 0 2px 10px var(--shadow-soft-color);
	overflow: hidden;
}

.accolades-group {
	display: flex;
	flex-direction: column;
	gap: 5px;
	padding: 10px 12px;
}

.accolades-group + .accolades-group {
	border-top: 1px solid var(--surface-border-color);
}

.accolades-group-head {
	display: flex;
	align-items: center;
	gap: 7px;
	cursor: help;
}

.accolades-group-dot {
	width: 9px;
	height: 9px;
	border-radius: 3px;
	background: var(--group-color);
}

.accolades-group-title {
	font-size: 12.5px;
	color: var(--heading-color, #2a2d48);
}

.accolades-group-count {
	margin-left: auto;
	font-size: 11px;
	font-weight: 700;
	color: var(--font-sec-color);
}

.accolades-group-progress {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 11px;
	color: var(--font-sec-color);
}

.accolades-group-progress span {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.accolades-group-progress.done {
	font-weight: 700;
	color: #2fbf5b;
}

.accolades-badges {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 2px;
}

.accolades-badges button {
	display: block;
	padding: 2px;
	border: none;
	border-radius: 8px;
	background: transparent;
	cursor: pointer;
	/* locked: grayed out */
	opacity: 0.3;
	filter: grayscale(1);
	transition: transform 0.15s ease, opacity 0.15s ease;
}

.accolades-badges button:hover {
	opacity: 0.55;
}

.accolades-badges button.unlocked {
	opacity: 1;
	filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
}

.accolades-badges button.unlocked:hover {
	transform: translateY(-2px) scale(1.05);
}

.accolades-badges img {
	display: block;
	width: 46px;
	height: 46px;
}

/* full-size badge */
.accolade-popup {
	position: fixed;
	/* content area only, so the arrows don't land on the sidebar */
	top: 0;
	bottom: 0;
	left: var(--frame-left, 0px);
	width: var(--content-width, 100%);
	z-index: 100;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	background: rgba(10, 11, 22, 0.85);
	cursor: pointer;
}

.accolade-popup-badge {
	display: flex;
	flex-direction: column;
	align-items: center;
	max-width: calc(100% - 110px);
	color: #fff;
	text-align: center;
}

.accolade-popup-badge img {
	width: min(200px, 50vw);
	margin-bottom: 16px;
	filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5));
}

.accolade-popup-badge.locked img {
	filter: grayscale(1) brightness(0.7);
	opacity: 0.6;
}

.accolade-popup-badge small {
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	filter: brightness(1.5);
}

.accolade-popup-badge div {
	font-size: 24px;
	font-weight: 700;
}

.accolade-popup-badge p {
	margin-top: 6px;
	font-size: 13px;
	color: #c4c6da;
}

.accolade-popup-badge .accolade-popup-status {
	margin-top: 10px;
	padding: 4px 12px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.1);
	font-size: 12px;
	font-weight: 700;
	color: #fff;
}

.accolade-popup-arrow {
	border: none;
	background: rgba(255, 255, 255, 0.12);
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: background-color 0.15s;
}

.accolade-popup-arrow:hover {
	background: rgba(255, 255, 255, 0.25);
}

.accolade-popup-arrow svg {
	width: 18px;
	height: 18px;
	fill: none;
	stroke: #fff;
	stroke-width: 2.5;
	stroke-linecap: round;
	stroke-linejoin: round;
}

/* the arrows sit outside the badge, so the badge stays centered */
.accolade-popup-arrow.arrow-prev {
	position: absolute;
	left: 12px;
}

.accolade-popup-arrow.arrow-next {
	position: absolute;
	right: 12px;
}

.accolade-popup-enter-active,
.accolade-popup-leave-active {
	transition: opacity 0.2s ease;
}

.accolade-popup-enter-active .accolade-popup-badge,
.accolade-popup-leave-active .accolade-popup-badge {
	transition: transform 0.25s ease;
}

.accolade-popup-enter-from,
.accolade-popup-leave-to {
	opacity: 0;
}

.accolade-popup-enter-from .accolade-popup-badge,
.accolade-popup-leave-to .accolade-popup-badge {
	transform: scale(0.85);
}

@media (prefers-reduced-motion: reduce) {
	.accolade-popup-enter-active,
	.accolade-popup-leave-active,
	.accolade-popup-enter-active .accolade-popup-badge,
	.accolade-popup-leave-active .accolade-popup-badge,
	.accolades-badges button {
		transition: none;
	}
}
</style>
