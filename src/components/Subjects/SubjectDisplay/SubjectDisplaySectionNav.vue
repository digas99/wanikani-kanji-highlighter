<template>
	<div v-if="tabs.length" class="sd-popupDetails_navbar">
		<ul>
			<li
				v-for="tab in tabs"
				:key="tab.id"
				:title="`${tab.label} (${tab.shortcut})`"
				class="sd-detailsPopup_clickable"
				:class="{ 'sd-popupDetails_navbar-selected': activeTab === tab.id }"
				@click="$emit('scroll-section', tab.id)"
			>
				<div>
					<img :src="tab.icon" :alt="tab.label">
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { popupIconUrl } from '@/utils/scripts/subjectDetailsPopup';

export default {
	name: 'SubjectDisplaySectionNav',

	props: {
		showCards: Boolean,
		showStatistics: Boolean,
		showTimestamps: Boolean,
		activeTab: {
			type: String,
			default: 'Info',
		},
	},

	emits: ['scroll-section'],

	computed: {
		tabs() {
			const tabs = [
				{
					id: 'Info',
					label: 'Info',
					shortcut: 'I',
					icon: popupIconUrl('/icons/search/target.png'),
				},
			];

			if (this.showCards) {
				tabs.push({
					id: 'Cards',
					label: 'Cards',
					shortcut: 'C',
					icon: popupIconUrl('/icons/search/list.png'),
				});
			}

			if (this.showStatistics) {
				tabs.push({
					id: 'Statistics',
					label: 'Statistics',
					shortcut: 'S',
					icon: popupIconUrl('/icons/subjectDetails/checkmark.png'),
				});
			}

			if (this.showTimestamps) {
				tabs.push({
					id: 'Timestamps',
					label: 'Timestamps',
					shortcut: 'T',
					icon: popupIconUrl('/icons/search/time.png'),
				});
			}

			return tabs;
		},
	},
};
</script>

<style scoped>
.sd-popupDetails_navbar-selected {
	background-color: #d73267 !important;
}

.sd-popupDetails_navbar-selected img {
	filter: invert(1) !important;
}
</style>
