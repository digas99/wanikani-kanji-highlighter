<template>
	<div v-if="entries.length" class="sd-detailsPopup_sectionContainer">
		<div id="sd-popupDetails_TimestampsSection" class="sd-popupDetails_anchor"></div>
		<strong class="sd-popupDetails_title">Timestamps</strong>

		<ol class="sd-timeline">
			<li v-for="entry in entries" :key="entry.key" class="sd-timeline_item">
				<span class="sd-timeline_icon"><img :src="entry.icon" alt=""></span>
				<div class="sd-timeline_text">
					<strong>{{ entry.label }}</strong>
					<span class="sd-muted">{{ entry.value }}</span>
				</div>
				<span class="sd-timeline_relative">{{ entry.relative }}</span>
			</li>
		</ol>
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
import { prettyTime } from '@/utils/scripts/time';

/** "in 3h 20m" for a future timestamp, "available now" for a past one. */
function formatTimeUntil(value) {
	const delta = new Date(value).getTime() - Date.now();
	if (!Number.isFinite(delta)) return '';
	if (delta <= 0) return 'available now';
	return `in ${prettyTime(delta, { short: true, seconds: false })}`;
}

/** Life-cycle order (unlocked → … → burned), then what's next / last activity. */
const TIMESTAMP_ORDER = [
	{ key: 'created_at', icon: '/icons/subjectDetails/language.png' },
	{ key: 'unlocked_at', icon: '/icons/subjectDetails/language.png' },
	{ key: 'started_at', icon: '/icons/search/no-stopping.png' },
	{ key: 'passed_at', icon: '/icons/subjectDetails/checkmark.png' },
	{ key: 'burned_at', icon: '/icons/subjectDetails/check.png' },
	{ key: 'resurrected_at', icon: '/icons/subjectDetails/eye.png' },
	{ key: 'available_at', icon: '/icons/search/time.png' },
	{ key: 'data_updated_at', icon: '/icons/kanjiDraw/up-arrow-thick.png' },
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

			return TIMESTAMP_ORDER
				// only what actually happened: empty fields were shown as "No Data"
				.filter(({ key }) => timestamps[key])
				.map(({ key, icon }) => ({
					key,
					label: key === 'available_at' ? 'Next Review' : formatTimestampLabel(key),
					value: formatTimestampValue(timestamps[key]),
					relative: key === 'available_at'
						? formatTimeUntil(timestamps[key])
						: formatDaysPassed(timestamps[key]),
					icon: popupIconUrl(icon),
				}));
		},
	},
};
</script>
