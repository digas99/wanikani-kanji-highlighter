<template>
	<div class="container lessons-page" :class="{ 'no-lessons': noLessons }">
		<QueueSubjectsView
			:header-title="headerTitle"
			:sections="sections"
			:height="noLessons ? 90 : 430"
			:loading="!wk.dashboardRefreshedAt"
			:bar-sorting="barSorting"
			menu-key="lessons"
			empty-message="No lessons found. You're all caught up!"
		/>

		<!-- none now: the ones to come, as their parts reach Guru -->
		<div v-if="noLessons && upcomingSections.length" class="lessons-upcoming">
			<QueueSubjectsView
				:header-title="upcomingTitle"
				:sections="upcomingSections"
				:height="300"
				:show-bar="false"
				menu-key="lessons-upcoming"
				empty-message="Nothing to unlock on this level."
			>
				<template #header-end>
					<InfoTip label="When these unlock">
						The earliest each one can unlock: when its parts reach Guru, with every review done
						as soon as it's due and answered right.
					</InfoTip>
				</template>
			</QueueSubjectsView>
		</div>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import QueueSubjectsView from '@/components/Queue/QueueSubjectsView.vue';
import InfoTip from '@/components/InfoTip.vue';
import {
	buildQueueSubjectItems,
	groupLessonQueueSections,
} from '@/utils/scripts/queueSubjects';
import { upcomingLessons } from '@/utils/scripts/upcomingLessons';

/** the days ahead, each its color (then the rest together) */
const DAY_COLORS = ['#f100a1', '#c400c8', '#a100f1', '#6f3ff5', '#3b6cf0', '#0093dd'];

export default {
	name: 'Lessons',

	components: {
		InfoTip,
		QueueSubjectsView,
	},

	data() {
		return {
			/** the current level's subjects (with their assignments), for the lessons to come */
			levelSubjects: [],
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		lessonItems() {
			const subjectIds = this.wk.summary.lessons.map(item => item.subject_id);
			return buildQueueSubjectItems(
				subjectIds,
				this.wk.assignments,
				this.wk.allSubjects,
			);
		},
		sections() {
			return groupLessonQueueSections(this.lessonItems);
		},
		noLessons() {
			return this.wk.summary.lessons.length === 0;
		},
		headerTitle() {
			return `<b>${this.wk.summary.lessons.length}</b> Lessons available right now!`;
		},
		barSorting() {
			return { radical: 0, kanji: 1, vocabulary: 2 };
		},
		upcoming() {
			if (!this.levelSubjects.length) return [];
			const assignmentById = new Map(this.wk.assignments.map(assignment => [assignment.subject_id, assignment]));
			const levelById = new Map(this.wk.allSubjects.map(subject => [subject.id, subject.level]));
			const subjects = this.levelSubjects.map(subject => ({
				...subject,
				assignment: assignmentById.get(subject.id) ?? subject.assignment ?? {},
			}));
			return upcomingLessons(subjects, {
				assignmentOf: id => assignmentById.get(id),
				levelOf: id => levelById.get(id),
			});
		},
		/** by the day they can unlock: today, tomorrow, the weekdays after, then later */
		upcomingSections() {
			const startOfDay = time => {
				const date = new Date(time);
				date.setHours(0, 0, 0, 0);
				return date.getTime();
			};
			const today = startOfDay(Date.now());
			const groups = new Map();
			for (const { subject, unlockAt } of this.upcoming) {
				const days = Math.round((startOfDay(unlockAt) - today) / 86_400_000);
				const key = Math.min(days, DAY_COLORS.length);
				const label = days <= 0 ? 'Today'
					: days === 1 ? 'Tomorrow'
						: key === DAY_COLORS.length ? 'Later'
							: new Date(unlockAt).toLocaleDateString([], { weekday: 'long' });
				if (!groups.has(key)) groups.set(key, { id: `day-${key}`, label, color: DAY_COLORS[Math.min(key, DAY_COLORS.length - 1)], items: [] });
				groups.get(key).items.push({
					...subject,
					subject_type: subject.type,
					// locked: no SRS stage yet
					assignment: { srs_stage: 0, passed_at: null, hidden: false },
				});
			}
			return [...groups.entries()].sort(([a], [b]) => a - b).map(([, group]) => group);
		},
		upcomingTitle() {
			const count = this.upcoming.length;
			return `<b>${count}</b> ${count === 1 ? 'lesson' : 'lessons'} to come on this level`;
		},
	},

	watch: {
		// lessons all done: what comes next (the level's subjects, from the cache)
		noLessons: {
			immediate: true,
			handler(none) {
				if (none) void this.loadLevelSubjects();
			},
		},
	},

	mounted() {
		this.wk.refreshDashboard();
	},

	methods: {
		async loadLevelSubjects() {
			const level = this.wk.userInfo?.level;
			if (!level || this.levelSubjects.length) return;
			this.levelSubjects = await this.wk.fetchSubjectsForLevel(level);
		},
	},
};
</script>

<style scoped>
.lessons-page {
	background-color: var(--default-color);
	padding-bottom: 20px;
}

.lessons-upcoming {
	margin-top: 14px;
}

</style>

<style>
/* the list is the whole page: it reaches the bottom even when short (no cut-off look) */
.lessons-page .subject-list-panel .panel-sections {
	flex: none;
	height: var(--subject-list-height);
}

/* no lessons: the (empty) list stays short, whatever the window; the lessons to come below grow */
.lessons-page.no-lessons > .queue-subjects-view:first-child .subject-list-panel .panel-sections,
.lessons-page.no-lessons > :first-child .panel-sections {
	height: 90px;
	min-height: 0;
	overflow: hidden;
}
</style>
