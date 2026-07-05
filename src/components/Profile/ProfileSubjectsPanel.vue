<template>
	<div class="profile-subjects">
		<ProfileSubjectSection
			section-key="all"
			label="All"
			:subjects="subjects"
			:controls-only="true"
			@toggle-types="typesOpen = $event"
		/>

		<div v-show="typesOpen" class="subject-types">
			<ProfileSubjectSection
				v-for="section in typeSections"
				:key="section.key"
				:section-key="section.key"
				:label="section.label"
				:subjects="subjects"
			/>
		</div>
	</div>
</template>

<script>
import ProfileSubjectSection from '@/components/Profile/ProfileSubjectSection.vue';
import { useSettingsStore } from '@/stores/settings';
import { PROFILE_SECTIONS } from '@/utils/scripts/profileSubjects';

export default {
	name: 'ProfileSubjectsPanel',

	components: {
		ProfileSubjectSection,
	},

	props: {
		subjects: {
			type: Array,
			default: () => [],
		},
	},

	data() {
		return {
			typesOpen: useSettingsStore().settings.profile_menus.all.opened,
			typeSections: PROFILE_SECTIONS.filter(section => section.key !== 'all'),
			activeListMenu: null,
		};
	},

	provide() {
		return {
			getActiveListMenu: () => this.activeListMenu,
			setActiveListMenu: (sectionId, menu) => {
				if (
					this.activeListMenu?.sectionId === sectionId
					&& this.activeListMenu?.menu === menu
				) {
					this.activeListMenu = null;
					return;
				}
				this.activeListMenu = { sectionId, menu };
			},
			clearActiveListMenu: () => {
				this.activeListMenu = null;
			},
		};
	},

	mounted() {
		document.addEventListener('click', this.onDocumentClick);
	},

	beforeUnmount() {
		document.removeEventListener('click', this.onDocumentClick);
	},

	methods: {
		onDocumentClick(event) {
			const target = event?.target;
			if (target instanceof Element) {
				if (target.closest('.menu-popup') || target.closest('.section-control-btn')) {
					return;
				}
			}
			this.activeListMenu = null;
		},
	},
};
</script>

<style scoped>
.profile-subjects {
	background: var(--surface-muted-color);
}

.subject-types {
	padding: 8px;
	background: var(--surface-muted-color);
}
</style>
