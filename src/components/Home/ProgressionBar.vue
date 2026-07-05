<template>
	<ul id="progression-bar">
		<li v-for="(entry, index) in sorted(values)" :key="entry.id"
			:class="{ 'round-right': shouldRoundRight(index) }"
			:style="{ width: getStagePercentage(entry.items) + '%', backgroundColor: colors ? colors[entry.id] : '' }">
			<a
				v-if="scrollToSections"
				href="#"
				class="progression-bar-action"
				:style="{ backgroundColor: colors ? colors[entry.id] : '' }"
				@click.prevent="onSectionSelect(entry.id)"
			>
				<span v-if="showPercentage(entry.items)">{{ getStagePercentage(entry.items) }}%</span>
			</a>
			<RouterLink
				v-else
				:to="getLink(entry)"
				:style="{ backgroundColor: colors ? colors[entry.id] : '' }"
			>
				<span v-if="showPercentage(entry.items)">{{ getStagePercentage(entry.items) }}%</span>
			</RouterLink>
		</li>
	</ul>
</template>

<script>
import { RouterLink } from 'vue-router';

export default {
	name: 'ProgressionBar',

	emits: ['section-select'],

	computed: {
		totalAssignments() {
			// console.log(this.values);
			return this.values.map(entry => entry.items.length).reduce((a, b) => a + b, 0);
		}
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
	},

	methods: {
		getLink(entry) {
			if (this.linkQuery) {
				return this.linkQuery(entry);
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
		showPercentage(items) {
			const percentage = this.getStagePercentage(items);
			return percentage >= 10;
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
			const sortedValues = this.sorted(this.values);
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
</style>