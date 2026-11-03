<template>
	<div
		class="subject-list-panel"
		:style="panelStyle"
		@click="onPanelClick"
	>
		<div v-if="headerTitle" class="panel-header">
			<span v-html="headerTitle"></span>
			<!-- something on the header's right (e.g. a link), when given -->
			<span v-if="$slots['header-end']" class="panel-header-end"><slot name="header-end"></slot></span>
		</div>

		<div class="panel-content">
			<div v-if="showBar" class="panel-bar">
				<slot name="bar"></slot>
			</div>

			<div
				ref="scrollContainer"
				class="panel-sections subjects-list"
				@scrollend="onScroll"
			>
				<!-- still loading: placeholder sections, not "nothing here" -->
				<div v-if="loading && !sections.length" class="panel-skeleton" aria-busy="true" aria-label="Loading">
					<div v-for="block in [14, 8]" :key="block" class="panel-skeleton-section">
						<span class="panel-skeleton-head"></span>
						<span class="panel-skeleton-tiles">
							<span v-for="tile in block" :key="tile" class="panel-skeleton-tile"></span>
						</span>
					</div>
				</div>
				<p v-else-if="!sections.length" class="panel-empty">{{ emptyMessage }}</p>
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
import { pauseTileLoading } from '@/utils/scripts/tileLoading';
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
		/** the data is still coming: placeholders instead of the empty message */
		loading: {
			type: Boolean,
			default: false,
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
		clearTimeout(this.realignTimer);
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

		/** @returns {boolean} whether the section exists (and was scrolled to) */
		scrollToSection(sectionId) {
			const container = this.$refs.scrollContainer;
			if (!container) return false;

			const section = container.querySelector(
				`[data-section-id="${CSS.escape(String(sectionId))}"]`,
			);
			if (!section) return false;

			const topOf = () => section.getBoundingClientRect().top
				- container.getBoundingClientRect().top
				+ container.scrollTop;

			// long lists draw more tiles as they're scrolled: not on the way there (the sections
			// passed would grow, pushing this one down)
			pauseTileLoading(900);
			container.scrollTo({
				top: topOf(),
				behavior: 'smooth',
			});
			// there: exactly on it, whatever moved meanwhile
			clearTimeout(this.realignTimer);
			this.realignTimer = setTimeout(() => {
				if (Math.abs(section.getBoundingClientRect().top - container.getBoundingClientRect().top) > 2) {
					container.scrollTo({ top: topOf() });
				}
			}, 850);
			return true;
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
	/* a heading for the list under it: on its left edge, close to it */
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 4px 7px;
	background-color: var(--default-color);
	color: rgba(255, 255, 255, 0.72);
	font-size: 13px;
	font-weight: 600;
	line-height: 1.3;
	text-align: left;
}

.panel-header > span:first-child {
	flex: 1;
	min-width: 0;
}

/* the count (the titles' <b>): a pill */
.panel-header > span:first-child :deep(b) {
	display: inline-block;
	min-width: 22px;
	margin-right: 5px;
	padding: 1px 8px;
	box-sizing: border-box;
	border-radius: 999px;
	background-color: rgba(255, 255, 255, 0.16);
	color: #fff;
	font-size: 13px;
	font-weight: 800;
	text-align: center;
	font-variant-numeric: tabular-nums;
}

/* on the right */
.panel-header-end {
	flex-shrink: 0;
	font-size: 11.5px;
	font-weight: 700;
}

.panel-content {
	overflow: hidden;
	border-radius: 10px;
	padding: 5px;
	background-color: var(--fill-color);
	display: flex;
	flex-direction: column;
}

.panel-sections {
	overflow: auto;
	scroll-behavior: smooth;
	flex: 1;
}

/* the gap between the groups, as the profile's */
.panel-sections :deep(.subject-list-section) {
	margin-bottom: 8px;
}

.panel-sections :deep(.subject-list-section:last-child) {
	margin-bottom: 0;
}

.panel-sections :deep(.section-header) {
	column-gap: 10px;
}

.panel-sections :deep(.section-arrow .arrow) {
	padding: 4px;
	border-color: white;
	margin-bottom: -7px;
}

.panel-skeleton {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 2px;
}

.panel-skeleton-section {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.panel-skeleton-head {
	height: 34px;
	border-radius: 8px;
	background: var(--default-color);
	opacity: 0.85;
}

.panel-skeleton-tiles {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
	padding: 0 2px;
}

.panel-skeleton-tile {
	flex: 1 0 44px;
	max-width: 70px;
	height: 44px;
	border-radius: 6px;
	background-color: var(--surface-muted-color, #ececf2);
	background-image: linear-gradient(90deg, transparent 20%, rgba(255, 255, 255, 0.55) 50%, transparent 80%);
	background-size: 300% 100%;
	animation: panel-skeleton-shimmer 1.3s ease-in-out infinite;
}

@keyframes panel-skeleton-shimmer {
	from { background-position: 100% 0; }
	to { background-position: 0 0; }
}

.panel-empty {
	text-align: center;
	color: var(--font-sec-color);
	padding: 40px 16px;
}
</style>

<style>
/* a page's list: always its full height (a short list doesn't make the page end early);
   lists without one (e.g. Home's) fit their content */
.subject-list-panel .panel-sections {
	/* the basis, not just height: flex's 0% basis would win over it */
	flex-basis: var(--subject-list-height, 0%);
	height: var(--subject-list-height, auto);
}
</style>
