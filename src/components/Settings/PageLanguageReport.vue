<template>
	<!-- the page open in the browser: how it was told apart (cjk-highlighter's report), collapsed at first -->
	<div class="page-language" :class="{ open }">
		<button type="button" class="page-language-head" :aria-expanded="open" @click="open = !open">
			<span class="page-language-label">This page</span>
			<span class="page-language-headline">{{ headline }}</span>
			<svg class="page-language-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
		</button>
		<div v-if="open" class="page-language-details">
			<template v-if="words">
				<p>{{ words.page }}</p>
				<p class="page-language-counts">
					<span v-for="item in counts" :key="item.key">
						<span class="page-language-dot" :style="{ background: item.color }"></span>{{ item.count }} {{ item.label }}
					</span>
				</p>
				<p>{{ words.highlights }}</p>
				<p>{{ words.sharing }}</p>
				<button type="button" class="settings-button clickable page-language-outline" @click="toggleOutline">
					{{ outlined ? 'Hide the outlines' : 'Outline the paragraphs on the page' }}
				</button>
			</template>
			<p v-else>{{ notice }}</p>
		</div>
	</div>
</template>

<script>
import { LANGUAGE_COLORS, describeReport } from 'cjk-highlighter';
import { getActiveBrowserTab, parseBrowserTabSite } from '@/utils/scripts/activeBrowserTab';

const LABELS = { japanese: 'Japanese', chinese: 'Chinese', mixed: 'mixed', unclear: 'could be either' };

export default {
	name: 'PageLanguageReport',

	data() {
		return { open: false, report: null, notice: 'Reading the page…', tabId: null, outlined: false };
	},

	computed: {
		words() {
			return this.report ? describeReport(this.report) : null;
		},
		headline() {
			return this.words?.headline ?? this.notice;
		},
		counts() {
			if (!this.report) return [];
			return Object.keys(LABELS).map(key => ({ key, label: LABELS[key], count: this.report.paragraphs[key], color: LANGUAGE_COLORS[key] }));
		},
	},

	async mounted() {
		const tab = await getActiveBrowserTab();
		if (!tab?.id || !parseBrowserTabSite(tab).validSite) {
			this.notice = 'Not a web page';
			return;
		}
		this.tabId = tab.id;
		try {
			const answer = await browser.tabs.sendMessage(tab.id, { type: 'wkh:pageLanguage' });
			if (answer?.report) this.report = answer.report;
			else this.notice = answer?.notHere ?? 'Not highlighted here';
		} catch {
			// no content script there (a page opened before the extension was, a browser page)
			this.notice = "Can't read this page: reload it";
		}
	},

	beforeUnmount() {
		if (this.outlined) void this.outline(false);
		this.port?.disconnect();
	},

	methods: {
		async outline(on) {
			try {
				// held while the popup is open: the page takes the outlines off when it goes (closed)
				if (on && !this.port) this.port = browser.tabs.connect(this.tabId, { name: 'wkh:pageLanguage' });
				await browser.tabs.sendMessage(this.tabId, { type: 'wkh:pageLanguageOutline', on });
				this.outlined = on;
			} catch {
				this.outlined = false;
			}
		},
		toggleOutline() {
			void this.outline(!this.outlined);
		},
	},
};
</script>

<style scoped>
/* inside the section, as wide as its rows' content (their 12px sides) */
.page-language {
	margin: 10px 12px 6px;
	border-radius: 8px;
	background: var(--surface-muted-color);
	font-size: 12px;
}

.page-language-head {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 8px 10px;
	border: none;
	background: none;
	color: var(--font-color);
	font: inherit;
	text-align: left;
	cursor: pointer;
}

.page-language-label {
	color: var(--font-sec-color);
}

.page-language-headline {
	flex: 1;
	font-weight: 700;
}

.page-language-chevron {
	width: 16px;
	height: 16px;
	fill: none;
	stroke: var(--font-sec-color);
	stroke-width: 2;
	transition: transform 0.15s;
}

.page-language.open .page-language-chevron {
	transform: rotate(180deg);
}

.page-language-details {
	padding: 0 10px 10px;
	color: var(--font-sec-color);
	line-height: 1.45;
}

.page-language-details p {
	margin: 0 0 4px;
}

.page-language-counts {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 12px;
	color: var(--font-color);
}

/* a span: the popup styles its <i> elements as icons */
.page-language-dot {
	display: inline-block;
	width: 8px;
	height: 8px;
	margin-right: 4px;
	border-radius: 50%;
}

.page-language-outline {
	margin-top: 4px;
}
</style>
