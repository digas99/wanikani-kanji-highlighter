<template>
	<div class="changelog-panel">
		<div v-if="sections.length" class="changelog">
			<div class="readme-navbar">
				<button
					v-for="(section, index) in sections"
					:key="section.id"
					type="button"
					class="clickable"
					:class="{ 'readme-navbar-selected': selectedIndex === index }"
					@click="selectSection(index)"
				>
					{{ section.label }}
				</button>
			</div>
			<div ref="content" class="readme" v-html="sections[selectedIndex]?.html"></div>
		</div>
		<p v-else class="muted">Changelog unavailable.</p>
	</div>
</template>

<script>
import changelogMarkdown from '../../../CHANGELOG.md?raw';
import { parseChangelogMarkdown } from '@/utils/scripts/about';

export default {
	name: 'ChangelogPanel',

	data() {
		return {
			sections: parseChangelogMarkdown(changelogMarkdown),
			selectedIndex: 0,
		};
	},

	methods: {
		selectSection(index) {
			this.selectedIndex = index;
			this.$refs.content?.scrollTo({ top: 0, behavior: 'smooth' });
		},
	},
};
</script>

<style scoped>
.readme-navbar {
	display: flex;
	font-size: 12px;
	overflow: auto;
	margin-bottom: 4px;
	column-gap: 2px;
	padding-bottom: 2px;
}

.readme-navbar button {
	padding: 5px 8px;
	border: 1px solid var(--surface-border-color);
	border-radius: 6px;
	color: var(--font-sec-color);
	font-weight: 600;
	background-color: var(--surface-subtle-color);
	font-family: inherit;
	font-size: 11px;
	white-space: nowrap;
	transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}

.readme-navbar-selected,
.readme-navbar button:hover {
	background-color: var(--default-color) !important;
	color: white !important;
	border-color: var(--default-color) !important;
}

.readme {
	max-height: 240px;
	overflow-y: auto;
	scroll-behavior: smooth;
	text-align: justify;
}

.readme :deep(h1) {
	margin-bottom: 10px;
	background-color: var(--default-color);
	padding: 8px 10px;
	border-radius: 6px;
	color: white;
	font-size: 16px;
}

.readme :deep(h1 a) {
	color: white;
}

.readme :deep(h2) {
	margin: 10px 0 5px;
	font-size: 14px;
	color: var(--default-color);
}

.readme :deep(ul) {
	padding-left: 18px;
	margin: 0 0 10px;
}

.readme :deep(li) {
	list-style: disc;
	margin-bottom: 4px;
}

.muted {
	color: var(--muted-color);
}
</style>
