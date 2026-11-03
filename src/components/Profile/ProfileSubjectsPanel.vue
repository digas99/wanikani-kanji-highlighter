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
	padding: 8px 5px;
	background: var(--fill-color);
}

/* each type as a small card, as the other tile lists' groups: rounded title, the tiles in a
   bounded, slightly tinted body under it */
.subject-types :deep(.subject-list-section) {
	margin-bottom: 8px;
}

.subject-types :deep(.subject-list-section:last-child) {
	margin-bottom: 0;
}

.subject-types :deep(.section-header) {
	border-top: none;
	border-radius: 10px 10px 0 0;
}

/* closed: just the title, rounded all round */
.subject-types :deep(.section-collapsed .section-header) {
	border-radius: 10px;
}

.subject-types :deep(.section-body) {
	padding: 4px;
	border: 1px solid var(--surface-border-color);
	border-top: none;
	border-radius: 0 0 10px 10px;
	background: color-mix(in srgb, var(--default-color) 5%, var(--fill-color));
}
</style>
