<template>
	<div v-if="entries.length" class="sd-detailsPopup_sectionContainer">
		<div id="sd-popupDetails_TimestampsSection" class="sd-popupDetails_anchor"></div>
		<strong class="sd-popupDetails_title">Timestamps</strong>
		<div style="margin-top: 10px;">
			<div
				v-for="entry in entries"
				:key="entry.key"
				style="padding: 5px 0; margin-bottom: 5px;"
			>
				<div class="sd-detailsPopup_img-label">
					<img :src="entry.icon" style="width: 22px;" alt="">
					<strong style="font-size: 22px;">{{ entry.label }}</strong>
				</div>
				<p style="padding: 5px 0 2px 8px; color: #c5c5c4;">{{ entry.value }}</p>
				<p style="padding: 2px 0 2px 8px; font-weight: bold;">{{ entry.relative }}</p>
			</div>
		</div>
	</div>
</template>

<script>
import {
	buildAssignmentTimestamps,
	formatDaysPassed,
	formatTimestampLabel,
	formatTimestampValue,
	popupIconUrl,
} from '@/utils/scripts/subjectDetailsPopup';

const TIMESTAMP_ICONS = [
	'/icons/kanjiDraw/up-arrow-thick.png',
	'/icons/search/time.png',
	'/icons/subjectDetails/check.png',
	'/icons/search/check.png',
	'/icons/subjectDetails/checkmark.png',
	'/icons/subjectDetails/eye.png',
	'/icons/search/no-stopping.png',
	'/icons/subjectDetails/language.png',
];

export default {
	name: 'SubjectDisplayAssignmentTimestamps',

	props: {
		item: {
			type: Object,
			required: true,
		},
	},

	computed: {
		entries() {
			const timestamps = buildAssignmentTimestamps(this.item.assignment);
			if (!timestamps) return [];

			return Object.keys(timestamps).map((key, index) => ({
				key,
				label: formatTimestampLabel(key),
				value: formatTimestampValue(timestamps[key]),
				relative: formatDaysPassed(timestamps[key]),
				icon: popupIconUrl(TIMESTAMP_ICONS[index] ?? TIMESTAMP_ICONS[0]),
			}));
		},
	},
};
</script>
