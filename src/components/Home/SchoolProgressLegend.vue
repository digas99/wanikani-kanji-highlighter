<template>
	<div class="school-progress-legend">
		<div v-for="item in items" :key="item.column">
			<span class="legend-color" :style="{ backgroundColor: item.color }"></span>
			<span class="legend-label">{{ item.label }}</span>
		</div>
	</div>
</template>

<script>
export default {
	name: 'SchoolProgressLegend',

	data() {
		return {
			items: [
				{ column: 'locked', label: 'Locked', color: '#ffffff' },
				{ column: 'progress', label: 'In progress', color: 'var(--ap4-color)' },
				{ column: 'passed', label: 'Passed', color: '#000000' },
				{ column: 'burned', label: 'Burned', color: 'var(--brn-color)' },
			],
		};
	},
};
</script>

<style scoped>
.school-progress-legend {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
	gap: 6px 10px;
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
