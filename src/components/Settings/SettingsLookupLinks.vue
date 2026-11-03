<template>
	<div class="settings-section">
		<p class="settings-section-title">Lookup links</p>
		<div class="settings-section-body">
			<p class="settings-description lookup-help">
				Buttons in the subject details to look the subject up on other sites.
				Use <code>%s</code> in the URL where the search text goes.
			</p>

			<ul v-if="links.length" class="lookup-list">
				<li v-for="(link, index) in links" :key="link.id" class="lookup-item">
					<div class="lookup-item-main">
						<strong class="lookup-item-name">{{ link.name }}</strong>
						<span class="lookup-item-url" :title="link.url">{{ link.url }}</span>
					</div>
					<select
						class="settings-select lookup-item-query"
						:value="link.query"
						title="What is searched"
						@change="settings.updateLookupLink(link.id, { query: $event.target.value })"
					>
						<option v-for="option in queryOptions" :key="option.value" :value="option.value">
							{{ option.label }}
						</option>
					</select>
					<div class="lookup-item-actions">
						<button
							type="button"
							class="lookup-icon-btn"
							title="Move up"
							:disabled="index === 0"
							@click="settings.moveLookupLink(link.id, -1)"
						>↑</button>
						<button
							type="button"
							class="lookup-icon-btn"
							title="Move down"
							:disabled="index === links.length - 1"
							@click="settings.moveLookupLink(link.id, 1)"
						>↓</button>
						<button
							type="button"
							class="lookup-icon-btn danger"
							:title="`Remove ${link.name}`"
							@click="settings.removeLookupLink(link.id)"
						>×</button>
					</div>
				</li>
			</ul>
			<p v-else class="muted lookup-empty">No lookup links yet.</p>

			<form class="lookup-add" @submit.prevent="addLink">
				<input v-model="draft.name" class="site-list-input" type="text" placeholder="Name (e.g. Jisho)" maxlength="30">
				<input v-model="draft.url" class="site-list-input" type="text" placeholder="https://jisho.org/search/%s">
				<div class="lookup-add-row">
					<select v-model="draft.query" class="settings-select" title="What is searched">
						<option v-for="option in queryOptions" :key="option.value" :value="option.value">
							{{ option.label }}
						</option>
					</select>
					<button type="submit" class="settings-button">Add link</button>
				</div>
				<p v-if="error" class="site-list-error">{{ error }}</p>
			</form>

			<div v-if="availablePresets.length" class="lookup-presets">
				<span class="muted">Suggestions:</span>
				<button
					v-for="preset in availablePresets"
					:key="preset.name"
					type="button"
					class="lookup-preset"
					:title="preset.url"
					@click="settings.addLookupLink(preset)"
				>
					+ {{ preset.name }}
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import { useSettingsStore } from '@/stores/settings';
import {
	LOOKUP_PRESETS,
	LOOKUP_QUERY_OPTIONS,
	normalizeLookupUrl,
	sanitizeLookupLinks,
} from '@/utils/scripts/lookupLinks';

export default {
	name: 'SettingsLookupLinks',

	data() {
		return {
			draft: { name: '', url: '', query: 'characters' },
			error: '',
			queryOptions: LOOKUP_QUERY_OPTIONS,
		};
	},

	computed: {
		settings() {
			return useSettingsStore();
		},
		links() {
			return sanitizeLookupLinks(this.settings.settings.lookup?.links);
		},
		availablePresets() {
			const urls = new Set(this.links.map(link => link.url));
			return LOOKUP_PRESETS.filter(preset => !urls.has(preset.url));
		},
	},

	methods: {
		async addLink() {
			this.error = '';
			const url = normalizeLookupUrl(this.draft.url);
			if (!url) {
				this.error = 'Enter a valid http(s) URL, e.g. https://jisho.org/search/%s';
				return;
			}
			let name = this.draft.name.trim();
			if (!name) {
				try {
					name = new URL(url.split('%s').join('x')).hostname.replace(/^www\./, '');
				} catch {
					name = 'Lookup';
				}
			}
			await this.settings.addLookupLink({ name, url, query: this.draft.query });
			this.draft = { name: '', url: '', query: this.draft.query };
		},
	},
};
</script>

<style scoped>
.lookup-help {
	padding: 4px 12px 8px;
}

.lookup-help code {
	padding: 0 4px;
	border-radius: 4px;
	background: var(--surface-muted-color);
	font-size: 11px;
}

.lookup-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 0 12px 10px;
}

.lookup-item {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto auto;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	border: 1px solid var(--surface-border-color);
	border-radius: var(--control-radius, 8px);
	background: var(--surface-subtle-color);
}

.lookup-item-main {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.lookup-item-name {
	font-size: 12.5px;
	color: var(--heading-color, #2a2d48);
}

.lookup-item-url {
	font-size: 11px;
	color: var(--font-sec-color);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.lookup-item-query {
	min-width: 0;
	max-width: 118px;
}

.lookup-item-actions {
	display: flex;
	gap: 3px;
}

.lookup-icon-btn {
	width: 24px;
	height: 24px;
	border: none;
	border-radius: 6px;
	background: var(--surface-muted-color);
	color: var(--font-sec-color);
	font-size: 14px;
	line-height: 1;
	cursor: pointer;
}

.lookup-icon-btn:hover:not(:disabled) {
	color: var(--heading-color, #2a2d48);
}

.lookup-icon-btn:disabled {
	opacity: 0.35;
	cursor: default;
}

.lookup-icon-btn.danger:hover {
	color: #fff;
	background: var(--danger-bg-color);
}

.lookup-empty {
	padding: 0 12px 10px;
	font-size: 12px;
}

.lookup-add {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 10px 12px;
	border-top: 1px solid var(--row-border-color);
}

.lookup-add-row {
	display: flex;
	justify-content: space-between;
	gap: 8px;
}

.lookup-presets {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	padding: 0 12px 12px;
	font-size: 11.5px;
}

.lookup-preset {
	border: 1px solid var(--surface-border-color);
	border-radius: 999px;
	background: var(--surface-muted-color);
	color: var(--heading-color, #2a2d48);
	font-family: inherit;
	font-size: 11px;
	font-weight: 600;
	padding: 3px 9px;
	cursor: pointer;
}

.lookup-preset:hover {
	border-color: var(--pill-color, #e36f94);
}
</style>
