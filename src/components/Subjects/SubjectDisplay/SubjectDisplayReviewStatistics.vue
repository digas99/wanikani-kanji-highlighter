<template>
	<div v-if="stats" class="sd-detailsPopup_sectionContainer">
		<div id="sd-popupDetails_StatisticsSection" class="sd-popupDetails_anchor"></div>
		<strong class="sd-popupDetails_title">Statistics</strong>

		<div class="sd-statsOverall">
			<div class="sd-statsOverall_value" :style="{ color: percentageColor(stats.percentage_correct) }">
				{{ Math.round(stats.percentage_correct) }}%
			</div>
			<div class="sd-statsOverall_label">
				<span class="sd-detailsPopup_img-label">
					<img :src="icons.overall" alt="">
					Overall correct
				</span>
				<span class="sd-muted">{{ totalReviews }} answers</span>
			</div>
		</div>

		<div class="sd-statsGrid">
			<div v-for="section in detailSections" :key="section.label" class="sd-statTile">
				<div class="sd-statTile_head">
					<span class="sd-detailsPopup_img-label">
						<img :src="section.icon" alt="">
						{{ section.label }}
					</span>
					<strong :style="{ color: percentageColor(section.correctPercent) }">
						{{ section.correctPercent }}%
					</strong>
				</div>
				<div class="sd-statTile_bar" :title="`${section.correct} correct, ${section.incorrect} incorrect`">
					<span :style="{ width: `${section.correctPercent}%`, background: percentageColor(section.correctPercent) }"></span>
				</div>
				<dl class="sd-statTile_rows">
					<div><dt>Correct</dt><dd>{{ section.correct }}</dd></div>
					<div><dt>Incorrect</dt><dd>{{ section.incorrect }}</dd></div>
					<div><dt>Streak</dt><dd>{{ section.currentStreak }} <span class="sd-muted">(max {{ section.maxStreak }})</span></dd></div>
				</dl>
			</div>
		</div>
	</div>
</template>

<script>
import {
	getReviewStats,
	popupIconUrl,
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

			return ['Meaning', 'Reading']
				.map(label => {
					const key = label.toLowerCase();
					const correct = this.stats[`${key}_correct`];
					const incorrect = this.stats[`${key}_incorrect`];
					const total = correct + incorrect;

					return {
						label,
						icon: key === 'meaning' ? this.icons.meaning : this.icons.reading,
						correct,
						incorrect,
						total,
						correctPercent: total ? Math.round((correct / total) * 100) : 0,
						currentStreak: this.stats[`${key}_current_streak`],
						maxStreak: this.stats[`${key}_max_streak`],
					};
				})
				// radicals / kana vocabulary have no reading reviews
				.filter(section => section.total > 0);
		},
	},
};
</script>
