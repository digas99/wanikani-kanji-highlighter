<template>
	<ul id="progression-bar">
		<!-- optional target line (e.g. the 90% needed to level up); absolutely positioned,
		     placed first so it doesn't change the segments' :last-child rounding -->
		<li
			v-if="marker"
			class="progression-bar-marker"
			:class="{ reached: marker.reached }"
			:style="{ left: `${marker.position}%` }"
			aria-hidden="true"
		></li>
		<li v-for="(entry, index) in segments" :key="entry.id"
			:class="{ 'round-right': shouldRoundRight(index) }"
			:title="segmentTitle(entry)"
			:style="{ width: getStagePercentage(entry.items) + '%', backgroundColor: colorOf(entry) }">
			<a
				v-if="scrollToSections"
				href="#"
				class="progression-bar-action"
				:style="{ backgroundColor: colorOf(entry) }"
				@click.prevent="onSectionSelect(entry.source?.id ?? entry.id)"
			>
				<span v-if="showPercentage(entry.items, entry.id)" :style="{ color: textColor(entry) }">{{ getStagePercentage(entry.items) }}%</span>
			</a>
			<RouterLink
				v-else
				:to="getLink(entry.source ?? entry)"
				:style="{ backgroundColor: colorOf(entry) }"
			>
				<span v-if="showPercentage(entry.items, entry.id)" :style="{ color: textColor(entry) }">{{ getStagePercentage(entry.items) }}%</span>
			</RouterLink>
		</li>
	</ul>
</template>

<script>
import { RouterLink } from 'vue-router';
import { fontColorFromBackground } from '@/utils/scripts/profileSubjects';
import { srsStages } from '@/utils/scripts/wanikani';
import { KNOWN_LABEL, countKnownSubjects, useKnownSubjects } from '@/utils/scripts/knownSubjects';

/** the locked segment's id (level bars and Home's use SRS ids: -1 = locked) */
const LOCKED_ID = '-1';
const KNOWN_ID = 'known';

export default {
	name: 'ProgressionBar',

	emits: ['section-select'],

	data() {
		return { known: useKnownSubjects() };
	},

	computed: {
		totalAssignments() {
			// console.log(this.values);
			return this.values.map(entry => entry.items.length).reduce((a, b) => a + b, 0);
		},
		/**
		 * The segments as drawn: the locked one's subjects marked as known (knownSubjects.ts) get
		 * their own part in the known color, just before it. Clicking it goes where locked goes.
		 */
		segments() {
			const out = [];
			for (const entry of this.sorted(this.values)) {
				const knownCount = String(entry.id) === LOCKED_ID ? this.knownIn(entry) : 0;
				if (!knownCount) {
					out.push(entry);
					continue;
				}
				out.push({ id: KNOWN_ID, items: { length: knownCount }, source: entry });
				const rest = entry.items.length - knownCount;
				if (rest > 0) out.push({ ...entry, items: { length: rest } });
			}
			return out;
		},
	},

	props: {
		values: {
			type: Object,
		},
		colors: {
			type: Object,
		},
		type: {
			type: String
		},
		sorting: {
			type: Object,
		},
		scrollToSections: {
			type: Boolean,
			default: false,
		},
		linkQuery: {
			type: Function,
			default: null,
		},
		/** { position: percent from the left, title: tooltip, reached?: boolean } */
		marker: {
			type: Object,
			default: null,
		},
		/** the locked subjects marked as known, when the locked segment is only a count (Home's) */
		knownCount: {
			type: Number,
			default: null,
		},
	},

	methods: {
		/** Tooltip prefix: "Locked: " / "Apprentice I: " ... (level bars use SRS ids; -1 = locked, 5 = passed). */
		segmentLabel(id) {
			const key = String(id);
			if (key === '-1') return 'Locked: ';
			if (key === KNOWN_ID) return `${KNOWN_LABEL} (locked): `;
			if (this.type === 'level' && key === '5') return 'Passed: ';
			if (this.type === 'srs' || this.type === 'level') {
				const stage = srsStages[key];
				return stage ? `${stage.name}: ` : '';
			}
			return key && Number.isNaN(Number(key)) ? `${key.charAt(0).toUpperCase()}${key.slice(1)}: ` : '';
		},
		/** Segment tooltip; the marker's message (e.g. level-up target) is appended to every segment. */
		segmentTitle(entry) {
			const base = `${this.segmentLabel(entry.id)}${this.getStagePercentage(entry.items)}% (${entry.items.length})`;
			return this.marker?.title ? `${base}\n${this.marker.title}` : base;
		},
		colorOf(entry) {
			if (entry.id === KNOWN_ID && entry.source) return this.known.color;
			return this.colors ? this.colors[entry.id] : '';
		},
		/** Readable label on light segments (locked / initiate grays). */
		textColor(entry) {
			const color = this.colorOf(entry);
			return typeof color === 'string' && color.startsWith('#') ? fontColorFromBackground(color) : undefined;
		},
		/** The locked segment's known subjects: counted in its list, or given (Home's count). */
		knownIn(entry) {
			const count = this.knownCount ?? countKnownSubjects(entry.items, this.known.ids);
			return Math.min(Math.max(count, 0), entry.items.length);
		},
		getLink(entry) {
			if (this.linkQuery) {
				return this.linkQuery(entry);
			}
			// locked subjects (Home's overview bar): their own list
			if (this.type === 'srs' && String(entry.id) === '-1') {
				return { name: 'Subjects', query: { type: 'locked' } };
			}
			return {
				name: 'Subjects',
				query: { id: entry.id, type: this.type },
			};
		},
		onSectionSelect(sectionId) {
			this.$emit('section-select', sectionId);
		},
		getStagePercentage(items) {
			// console.log(items, this.totalAssignments);
			return ((items.length / this.totalAssignments) * 100).toFixed(1);
		},
		showPercentage(items, id) {
			const percentage = Number(this.getStagePercentage(items));
			// locked segments get their label earlier (the level's remaining share matters)
			const minimum = String(id) === '-1' ? 6 : 10;
			return percentage >= minimum;
		},
		sorted(values) {
			const entries = Array.isArray(values) ? [...values] : [];
			if (this.sorting && Object.keys(this.sorting).length) {
				return entries.sort((a, b) => this.sorting[a.id] - this.sorting[b.id]);
			}
			return entries.sort((a, b) => String(a.id).localeCompare(String(b.id)));
		},
		isLastItemWhite() {
			if (!this.$el || !this.$el.querySelector) return false;
			const element = this.$el.querySelector('#progression-bar>li:last-child');
			if (!element) return false;
			const bgColor = window.getComputedStyle(element).backgroundColor;
			return bgColor === 'rgb(255, 255, 255)' || bgColor === 'rgba(255, 255, 255, 1)' || bgColor === 'white';
		},
		shouldRoundRight(index) {
			const sortedValues = this.segments;
			const isLast = index === sortedValues.length - 1;
			const isSecondToLast = index === sortedValues.length - 2;
			
			if (this.isLastItemWhite()) {
				return isSecondToLast;
			}
			return isLast;
		}
	}
}
</script>

<style scoped>
#progression-bar {
	height: 25px;
	display: flex;
	flex-direction: row;
	position: relative;
	border-radius: 10px;
	overflow: hidden;
	padding-bottom: 5px;
}

#progression-bar>li {
	transition: width 0.2s;
}

#progression-bar>li.round-right {
	border-top-right-radius: 5px;
	border-bottom-right-radius: 5px;
	overflow: hidden;
}

#progression-bar>li>a {
	color: white;
	justify-content: center;
	align-items: center;
	display: flex;
	height: 100%;
	text-decoration: none;
}

.progression-bar-action {
	width: 100%;
	cursor: pointer;
}

/* target line, e.g. "pass 90% of this level's kanji to level up" */
#progression-bar > li.progression-bar-marker {
	position: absolute;
	top: 0;
	bottom: 5px; /* the bar's padding-bottom */
	width: 3px;
	margin-left: -1.5px;
	z-index: 2;
	/* dark core + white halo: visible on the light locked segment and on colored ones */
	background: #1d1f33;
	box-shadow: 0 0 0 1px #ffffff;
	transition: left 0.3s ease;
	/* purely visual: clicks go to the segment underneath (its tooltip has the message) */
	pointer-events: none;
}

/* reached: green, so it reads as "done" */
#progression-bar > li.progression-bar-marker.reached {
	background: #2fbf5b;
}
</style>