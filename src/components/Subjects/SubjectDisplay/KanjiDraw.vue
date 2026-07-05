<template>
	<div ref="drawHost" class="sd-popupDetails_dmak_draw"></div>
</template>

<script>
import Raphael from 'raphael';
window.Raphael = Raphael;
import '@/lib/dmakLoader.js';
import '@/lib/dmak.js';

export default {
	name: 'KanjiDraw',

	props: {
		kanjiSource: {
			type: String,
			default: 'https://kanji.wkhighlighter.com/',
		},
		characters: {
			type: String,
			required: true,
		},
		size: {
			type: Number,
			default: null,
		},
	},

	emits: ['dmak', 'loaded'],

	data() {
		return {
			dmak: null,
			drawGeneration: 0,
		};
	},

	watch: {
		characters() {
			this.initDraw();
		},
		size() {
			this.initDraw();
		},
	},

	mounted() {
		this.initDraw();
	},

	beforeUnmount() {
		this.destroyDraw();
	},

	methods: {
		initDraw() {
			const host = this.$refs.drawHost;
			if (!host || !this.characters) return;

			host.replaceChildren();

			const generation = this.drawGeneration + 1;
			this.drawGeneration = generation;
			this.drawStrokes(this.characters, host, this.size, generation);
			this.$emit('dmak', this.dmak);
		},
		destroyDraw() {
			this.drawGeneration += 1;

			if (this.dmak) {
				this.dmak.pause?.();
				this.dmak.erase?.();
				this.dmak = null;
			}

			this.$refs.drawHost?.replaceChildren();
		},
		drawStrokes(characters, hostElement, size, generation) {
			if (!characters || !hostElement) return;

			if (!size) size = 130 - (10 * characters.length);

			const wanikani = this.readThemeVar('--wanikani', '#f100a1', hostElement);
			const wanikaniSec = this.readThemeVar('--wanikani-sec', '#00aaff', hostElement);

			this.dmak = new Dmak(characters, {
				element: hostElement,
				uri: this.kanjiSource,
				width: size,
				height: size,
				step: 0.005,
				stroke: {
					attr: {
						active: wanikani,
						stroke: '#fff',
					},
					order: {
						visible: true,
						attr: {
							'font-size': 10,
							fill: wanikaniSec,
						},
					},
				},
				loaded: () => {
					if (generation !== this.drawGeneration) return;
					if (this.dmak) this.dmak.options.element = hostElement;

					const papers = this.dmak?.papers;
					if (!papers || generation !== this.drawGeneration) return;

					papers.forEach((paper, i) => {
						const canvas = paper.canvas;
						canvas.style.setProperty('display', 'block', 'important');
						const nStrokes = this.dmak.strokes.filter(stroke => stroke.char == i).length;
						const title = `Kanji ${this.dmak.text.charAt(i)} has ${nStrokes} strokes`;
						canvas.insertAdjacentHTML('afterbegin', `<title>${title}</title>`);
					});

					this.$emit('loaded');
				},
			});
			if (this.dmak) this.dmak.options.element = hostElement;
		},
		readThemeVar(name, fallback, element) {
			let node = element;
			while (node) {
				const value = getComputedStyle(node).getPropertyValue(name).trim();
				if (value) return value;
				node = node.parentElement;
			}

			const root = element?.getRootNode?.();
			if (root instanceof ShadowRoot) {
				const value = getComputedStyle(root.host).getPropertyValue(name).trim();
				if (value) return value;
			}

			return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
		},
	},
};
</script>

<style scoped>
.sd-popupDetails_dmak_draw {
	display: flex;
	flex-wrap: nowrap;
	justify-content: center;
	align-items: center;
	gap: 4px;
	width: 100%;
}

.sd-popupDetails_dmak_draw :deep(svg) {
	display: block;
}
</style>
