<template>
	<SubjectListSection
		:section-id="sectionKey"
		:menu-key="sectionKey"
		menu-scope="profile"
		:label="label"
		:subjects="sectionSubjects"
		:show-progress="showProgress"
		:controls-only="controlsOnly"
		:collapsible="true"
		:opened="opened"
		header-variant="profile"
		:count-label="progressLabel"
		@toggle-collapse="toggleOpened"
	/>
</template>

<script>
import SubjectListSection from '@/components/Subjects/SubjectListSection.vue';
import { useSettingsStore } from '@/stores/settings';
import {
	getSectionProgress,
	subjectsForSection,
} from '@/utils/scripts/profileSubjects';

export default {
	name: 'ProfileSubjectSection',

	components: {
		SubjectListSection,
	},

	props: {
		sectionKey: {
			type: String,
			required: true,
		},
		label: {
			type: String,
			required: true,
		},
		subjects: {
			type: Array,
			default: () => [],
		},
		controlsOnly: {
			type: Boolean,
			default: false,
		},
		showProgress: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['toggle-types'],

	computed: {
		settingsStore() {
			return useSettingsStore();
		},
		sectionSubjects() {
			return subjectsForSection(this.subjects, this.sectionKey);
		},
		progress() {
			return getSectionProgress(this.sectionSubjects);
		},
		progressLabel() {
			if (!this.showProgress) return '';
			return `${this.progress.passed} / ${this.progress.available}`;
		},
		opened: {
			get() {
				return this.settingsStore.settings.profile_menus[this.sectionKey].opened;
			},
			set(value) {
				this.settingsStore.setProfileMenuOpened(this.sectionKey, value);
				if (this.controlsOnly) {
					this.$emit('toggle-types', value);
				}
			},
		},
	},

	mounted() {
		if (this.controlsOnly) {
			this.$emit('toggle-types', this.opened);
		}
	},

	methods: {
		toggleOpened() {
			this.opened = !this.opened;
		},
	},
};
</script>
