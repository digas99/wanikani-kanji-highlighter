<template>
	<div id="sd-popupDetails_dmak_draw"></div>
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
			default: 'https://kanji.wkhighlighter.com/'
		},
		characters: {
			type: String,
			required: true
		},
		size: {
			type: Number,
			default: null
		}
	},

	data() {
		return {
			dmak: null,
		};
	},

	mounted() {
		this.drawStrokes(this.characters, 'sd-popupDetails_dmak_draw', this.size);
		this.$emit('dmak', this.dmak);
	},

	methods: {
		drawStrokes(characters, elementId, size) {
			if (!characters) return;

			if (!size) size = 130 - (10 * characters.length);

			console.log(characters, elementId, size);
			this.dmak = new Dmak(characters, {
				'element': elementId,
				'uri': this.kanjiSource,
				'width': size,
				'height': size,
				'step': 0.005,
				'stroke': {
					'attr': {
						'active': getComputedStyle(document.documentElement).getPropertyValue('--wanikani'),
						'stroke': '#fff',
					},
					'order': {
						'visible': true,
						'attr': {
							'font-size': 10,
							'fill': getComputedStyle(document.documentElement).getPropertyValue('--wanikani-sec'),
						}
					}
				},
				'loaded': async () => {
					// put strokes back into the shadow dom
					const dmakWrapper = document.querySelector("#sd-popupDetails_dmak_draw");
					if (dmakWrapper) {
						const drawingWrapper = document.querySelector("#sd-popupDetails_dmak");
						if (drawingWrapper) {
							Array.from(dmakWrapper.children).forEach(child => drawingWrapper.appendChild(child));
							dmakWrapper.remove();
						}
					}

					const papers = this.dmak.papers;
					if (papers) {
						const currentCharacters = document.querySelector(".sd-detailsPopup_kanji")?.innerText;
						console.log(currentCharacters, characters);
						if (characters == currentCharacters) {
							const currentCanvases = papers.map(paper => paper.canvas);

							// iterate all svgs and remove the ones that are not in currentCanvases
							const svgs = document.querySelectorAll("#sd-popupDetails_dmak svg");
							svgs.forEach(svg => {
								if (!currentCanvases.includes(svg))
									svg.remove();
								else {
									document.querySelector(".sd-popupDetails_svgLoading")?.remove();
									svg.style.setProperty("display", "block", "important");
								}
							});
						}

						// add title to each canvas with number of strokes
						papers.forEach((paper, i) => {
							const canvas = paper.canvas;
							const nStrokes = this.dmak.strokes.filter(stroke => stroke.char == i).length;
							const title = `Kanji ${this.dmak.text.charAt(i)} has ${nStrokes} strokes`;
							const titleWrapper = /*html*/`<title>${title}</title>`;
							canvas.insertAdjacentHTML("afterbegin", titleWrapper);
						});
					}
				}
			});
		}
	}
};
</script>

<style scoped></style>