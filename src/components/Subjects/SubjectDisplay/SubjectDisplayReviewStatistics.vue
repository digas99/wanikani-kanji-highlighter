<template>
	<div v-if="stats" class="sd-detailsPopup_sectionContainer">
		<div id="sd-popupDetails_StatisticsSection" class="sd-popupDetails_anchor"></div>
		<strong class="sd-popupDetails_title">Statistics</strong>
		<div style="margin-top: 10px;">
			<div style="margin-bottom: 10px;">
				<div class="sd-detailsPopup_img-label">
					<img :src="icons.overall" style="width: 22px;" alt="">
					<strong style="font-size: 22px;">Overall</strong>
				</div>
				<div style="padding-left: 8px;">
					<strong>Correct: </strong>
					<span :style="{ color: percentageColor(stats.percentage_correct) }">
						{{ Math.round(stats.percentage_correct) }}%
					</span>
				</div>
				<div style="padding-left: 8px;">
					<strong>Frequency: </strong>{{ totalReviews }}
				</div>
			</div>

			<div v-for="section in detailSections" :key="section.label" style="margin-bottom: 10px;">
				<div class="sd-detailsPopup_img-label">
					<img :src="section.icon" style="width: 22px;" alt="">
					<strong style="font-size: 22px;">{{ section.label }}</strong>
				</div>
				<div style="padding-left: 8px;">
					<strong>Correct: </strong>
					<span :style="{ color: percentageColor(section.correctPercent) }">
						{{ section.correct }} ({{ section.correctPercent }}%)
					</span>
				</div>
				<div style="padding-left: 8px;">
					<strong>Incorrect: </strong>
					<span>{{ section.incorrect }} ({{ section.incorrectPercent }}%)</span>
				</div>
				<div style="padding-left: 8px;">
					<strong>Frequency: </strong>{{ section.total }}
				</div>
				<div style="padding-left: 8px;">
					<strong>Streak (max): </strong>{{ section.currentStreak }} ({{ section.maxStreak }})
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import {
	getReviewStats,
	popupIconUrl,
	reviewPercentage,
	reviewPercentageColor,
} from '@/utils/scripts/subjectDetailsPopup';

export default {
	name: 'SubjectDisplayReviewStatistics',

	props: {
		item: {
			type: Object,
			required: true,
		},
	},

	computed: {
		stats() {
			return getReviewStats(this.item.reviews);
		},
		percentageColor() {
			return reviewPercentageColor;
		},
		totalReviews() {
			if (!this.stats) return 0;
			return this.stats.meaning_correct
				+ this.stats.meaning_incorrect
				+ this.stats.reading_correct
				+ this.stats.reading_incorrect;
		},
		icons() {
			return {
				overall: popupIconUrl('/icons/subjectDetails/checkmark.png'),
				meaning: popupIconUrl('/icons/subjectDetails/language.png'),
				reading: popupIconUrl('/icons/subjectDetails/eye.png'),
			};
		},
		detailSections() {
			if (!this.stats) return [];

			return ['Meaning', 'Reading'].map(label => {
				const key = label.toLowerCase();
				const correct = this.stats[`${key}_correct`];
				const incorrect = this.stats[`${key}_incorrect`];
				const total = correct + incorrect;
				const correctPercent = total ? Math.round((correct / total) * 100) : 0;
				const incorrectPercent = total ? Math.round((incorrect / total) * 100) : 0;

				return {
					label,
					icon: key === 'meaning' ? this.icons.meaning : this.icons.reading,
					correct,
					incorrect,
					total,
					correctPercent,
					incorrectPercent,
					currentStreak: this.stats[`${key}_current_streak`],
					maxStreak: this.stats[`${key}_max_streak`],
				};
			});
		},
	},
};
</script>
