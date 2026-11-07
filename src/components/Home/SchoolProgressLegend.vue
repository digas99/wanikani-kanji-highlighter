<template>
	<div class="school-progress-legend">
		<div v-for="item in items" :key="item.column">
			<span class="legend-color" :style="{ backgroundColor: item.color }"></span>
			<span class="legend-label">{{ item.label }}</span>
		</div>
	</div>
</template>

<script>
import { LOCKED_SEGMENT_COLOR } from '@/utils/scripts/schoolKanji';
import { KNOWN_LABEL, useKnownSubjects } from '@/utils/scripts/knownSubjects';

export default {
	name: 'SchoolProgressLegend',

	data() {
		return { known: useKnownSubjects() };
	},

	computed: {
		// as the bars read, left to right (known: only once something is marked)
		items() {
			return [
				{ column: 'burned', label: 'Burned', color: 'var(--brn-color)' },
				{ column: 'passed', label: 'Passed', color: '#000000' },
				{ column: 'progress', label: 'In progress', color: 'var(--ap4-color)' },
				...(this.known.ids.size ? [{ column: 'known', label: KNOWN_LABEL, color: this.known.color }] : []),
				{ column: 'locked', label: 'Locked', color: LOCKED_SEGMENT_COLOR },
			];
		},
	},
};
</script>

<style scoped>
/* one row (wrapping only when narrow), each item its own width: also beside a link */
.school-progress-legend {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 12px;
	min-width: 0;
	padding: 4px 2px 0;
}

.school-progress-legend > div {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 11px;
	color: var(--font-sec-color);
}

.legend-color {
	width: 10px;
	height: 10px;
	border: 1px solid #d0d0d8;
	border-radius: 2px;
	flex-shrink: 0;
}
</style>
