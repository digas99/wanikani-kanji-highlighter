<template>
	<div
		class="subject-list-panel"
		:style="panelStyle"
		@click="onPanelClick"
	>
		<div v-if="headerTitle" class="panel-header" v-html="headerTitle"></div>

		<div class="panel-content">
			<div v-if="showBar" class="panel-bar">
				<slot name="bar"></slot>
			</div>

			<div
				ref="scrollContainer"
				class="panel-sections subjects-list"
				@scrollend="onScroll"
			>
				<p v-if="!sections.length" class="panel-empty">{{ emptyMessage }}</p>
				<SubjectListSection
					v-for="section in sections"
					:key="section.sectionId"
					v-bind="sectionProps(section)"
				/>
			</div>
		</div>
	</div>
</template>

<script>
import SubjectListSection from '@/components/Subjects/SubjectListSection.vue';

export default {
	name: 'SubjectListPanel',

	components: {
		SubjectListSection,
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

	props: {
		sections: {
			type: Array,
			default: () => [],
		},
		headerTitle: {
			type: String,
			default: '',
		},
		showBar: {
			type: Boolean,
			default: false,
		},
		height: {
			type: [Number, String],
			default: null,
		},
		menuKey: {
			type: String,
			default: 'subjects',
		},
		showControls: {
			type: Boolean,
			default: true,
		},
		emptyMessage: {
			type: String,
			default: 'Nothing here.',
		},
	},

	emits: ['scroll'],

	data() {
		return {
			activeListMenu: null,
		};
	},

	computed: {
		panelStyle() {
			return {};
		},
	},

	mounted() {
		document.addEventListener('click', this.onDocumentClick);
	},

	beforeUnmount() {
		document.removeEventListener('click', this.onDocumentClick);
	},

	methods: {
		sectionProps(section) {
			return {
				menuScope: 'list',
				menuKey: section.menuKey ?? this.menuKey,
				showControls: section.showControls ?? this.showControls,
				headerVariant: section.headerVariant ?? 'compact',
				layout: section.layout ?? 'auto',
				collapsible: section.collapsible ?? false,
				opened: section.opened ?? true,
				showProgress: section.showProgress ?? false,
				...section,
			};
		},

		onPanelClick() {
			this.activeListMenu = null;
		},

		onDocumentClick(event) {
			const target = event?.target;
			if (target instanceof Element) {
				if (target.closest('.menu-popup') || target.closest('.section-control-btn')) {
					return;
				}
			}
			this.activeListMenu = null;
		},

		onScroll() {
			this.$emit('scroll', this.$refs.scrollContainer?.scrollTop ?? 0);
		},

		setScrollTop(value) {
			if (this.$refs.scrollContainer) {
				this.$refs.scrollContainer.scrollTop = value;
			}
		},

		scrollToSection(sectionId) {
			const container = this.$refs.scrollContainer;
			if (!container) return;

			const section = container.querySelector(
				`[data-section-id="${CSS.escape(String(sectionId))}"]`,
			);
			if (!section) return;

			const top = section.getBoundingClientRect().top
				- container.getBoundingClientRect().top
				+ container.scrollTop;

			container.scrollTo({
				top,
				behavior: 'smooth',
			});
		},
	},
};
</script>

<style scoped>
.subject-list-panel {
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.panel-header {
	text-align: center;
	background-color: var(--default-color);
	color: white;
	padding: 15px 5px;
	font-size: 15px;
}

.panel-content {
	overflow: hidden;
	border-top-left-radius: 10px;
	border-top-right-radius: 10px;
	padding: 5px;
	background-color: var(--fill-color);
	display: flex;
	flex-direction: column;
}

.panel-bar {
	padding: 0 0 5px;
}

.panel-sections {
	overflow: auto;
	scroll-behavior: smooth;
	flex: 1;
}

.panel-sections :deep(.subject-list-section) {
	padding: 5px;
}

.panel-sections :deep(.section-header) {
	column-gap: 10px;
}

.panel-sections :deep(.section-arrow .arrow) {
	padding: 4px;
	border-color: white;
	margin-bottom: -7px;
}

.panel-empty {
	text-align: center;
	color: var(--font-sec-color);
	padding: 40px 16px;
}
</style>

<style>
.subject-list-panel .panel-sections {
	max-height: var(--subject-list-height, none);
}
</style>
