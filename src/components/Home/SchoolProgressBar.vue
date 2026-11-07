<template>
	<ul class="school-progress-bar" :title="`Total: ${total}`">
		<li
			v-for="segment in segments"
			:key="segment.column"
			class="school-progress-segment"
			:style="{
				width: `${segment.width}%`,
				backgroundColor: segment.background,
				color: segment.textColor,
			}"
			:title="`${segment.label}: ${segment.count}`"
		>
			<RouterLink
				:to="{
					name: 'SchoolSubjects',
					query: { school, grade, jump: segment.jump ?? segment.column, ...(kind === 'vocabulary' ? { kind } : {}) },
				}"
			>
				<span v-if="segment.width > 8">{{ segment.count }}</span>
			</RouterLink>
		</li>
	</ul>
</template>

<script>
import { RouterLink } from 'vue-router';

export default {
	name: 'SchoolProgressBar',

	components: {
		RouterLink,
	},

	props: {
		school: {
			type: String,
			required: true,
		},
		grade: {
			type: String,
			required: true,
		},
		total: {
			type: Number,
			default: 0,
		},
		segments: {
			type: Array,
			default: () => [],
		},
		/** 'kanji' | 'vocabulary': which list the segments open */
		kind: {
			type: String,
			default: 'kanji',
		},
	},
};
</script>

<style scoped>
.school-progress-bar {
	display: flex;
	flex: 1;
	height: 25px;
	margin: 0;
	padding: 0;
	list-style: none;
	border-radius: 10px;
	overflow: hidden;
	background: var(--surface-muted-color);
}

.school-progress-segment {
	min-width: 0;
	transition: width 0.2s ease;
}

.school-progress-segment a {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 25px;
	width: 100%;
	color: inherit;
	text-decoration: none;
	font-size: 11px;
	font-weight: 700;
}
</style>
