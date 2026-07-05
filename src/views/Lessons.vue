<template>
	<div class="container lessons-page">
		<QueueSubjectsView
			:header-title="headerTitle"
			:sections="sections"
			:height="500"
			:bar-sorting="barSorting"
			menu-key="lessons"
			empty-message="No lessons found. You're all caught up!"
		/>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import QueueSubjectsView from '@/components/Queue/QueueSubjectsView.vue';
import {
	buildQueueSubjectItems,
	groupLessonQueueSections,
} from '@/utils/scripts/queueSubjects';

export default {
	name: 'Lessons',

	components: {
		QueueSubjectsView,
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
		headerTitle() {
			return `<b>${this.wk.summary.lessons.length}</b> Lessons available right now!`;
		},
		barSorting() {
			return { radical: 0, kanji: 1, vocabulary: 2 };
		},
	},

	mounted() {
		this.wk.refreshDashboard();
	},
};
</script>

<style scoped>
.lessons-page {
	background-color: var(--default-color);
	padding-bottom: 20px;
}
</style>

<style>
.lessons-page .queue-subjects-content {
	min-height: 500px;
}
</style>
