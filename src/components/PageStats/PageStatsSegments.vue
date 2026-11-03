<template>
	<!-- a thin bar of segments, Todaii-like (pageStats.ts barSegments) -->
	<span class="page-stats-segments" :style="{ height: `${height}px` }">
		<span
			v-for="segment in segments"
			:key="segment.key"
			:style="{ flexGrow: segment.count, background: segment.color }"
			:title="`${segment.label}: ${segment.count}`"
		></span>
	</span>
</template>

<script>
export default {
	name: 'PageStatsSegments',

	props: {
		segments: {
			type: Array,
			required: true,
		},
		height: {
			type: Number,
			default: 6,
		},
	},
};
</script>

<style scoped>
.page-stats-segments {
	display: flex;
	width: 100%;
	border-radius: 999px;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.12);
}

.page-stats-segments > span {
	min-width: 2px;
}
</style>
