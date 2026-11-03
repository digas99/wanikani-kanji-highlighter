<template>
	<!--
		A choice between a few options: buttons, the chosen one marked (not a dropdown: every option
		in sight). Few short ones sit on the right, as a switch would; more go under the label.
	-->
	<!-- a number or a length (pages kept, a timer's minutes…): a dropdown, compact -->
	<div v-if="dropdown" class="setting-row">
		<label :for="inputId" class="settings-item-label">
			{{ label }}
			<div v-if="description" class="settings-description">{{ description }}</div>
		</label>
		<select
			:id="inputId"
			class="settings-select setting-control"
			:value="modelValue"
			@change="$emit('update:modelValue', castValue($event.target.value))"
		>
			<option v-for="option in options" :key="String(optionValue(option))" :value="optionValue(option)">
				{{ optionLabel(option) }}
			</option>
		</select>
	</div>
	<div v-else class="setting-row" :class="{ 'setting-row-block': stacked }">
		<span :id="`${inputId}-label`" class="settings-item-label">
			{{ label }}
			<div v-if="description" class="settings-description">{{ description }}</div>
		</span>
		<div
			:id="inputId"
			class="setting-choices setting-control"
			role="radiogroup"
			:aria-labelledby="`${inputId}-label`"
		>
			<button
				v-for="option in options"
				:key="String(optionValue(option))"
				type="button"
				role="radio"
				class="setting-choice"
				:class="{ active: isChosen(option) }"
				:aria-checked="isChosen(option)"
				@click="choose(option)"
			>
				{{ optionLabel(option) }}
			</button>
		</div>
	</div>
</template>

<script>
/** On the right: up to this many options, this many characters in all; else under the label. */
const INLINE_MAX_OPTIONS = 3;
const INLINE_MAX_CHARS = 20;

export default {
	name: 'SettingSelect',

	props: {
		modelValue: {
			type: [String, Number],
			required: true,
		},
		label: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			default: '',
		},
		inputId: {
			type: String,
			required: true,
		},
		options: {
			type: Array,
			required: true,
		},
		numeric: {
			type: Boolean,
			default: false,
		},
		/** a dropdown, not buttons: for numbers and lengths (many values, one line) */
		dropdown: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['update:modelValue'],

	computed: {
		stacked() {
			const chars = this.options.reduce((sum, option) => sum + String(this.optionLabel(option)).length, 0);
			return this.options.length > INLINE_MAX_OPTIONS || chars > INLINE_MAX_CHARS;
		},
	},

	methods: {
		optionValue(option) {
			return typeof option === 'object' ? option.value : option;
		},
		optionLabel(option) {
			return typeof option === 'object' ? option.label : option;
		},
		castValue(value) {
			return this.numeric ? Number(value) : value;
		},
		isChosen(option) {
			return String(this.optionValue(option)) === String(this.modelValue);
		},
		choose(option) {
			if (this.isChosen(option)) return;
			this.$emit('update:modelValue', this.castValue(this.optionValue(option)));
		},
	},
};
</script>

<style scoped>
/* a segmented control, as the Activity card's switches */
.setting-choices {
	display: flex;
	flex-wrap: wrap;
	gap: 2px;
	padding: 2px;
	border: 1px solid var(--surface-border-color);
	border-radius: 8px;
	background: var(--surface-muted-color);
}

/* under the label (more options): each its own pill, wrapping freely */
.setting-row-block .setting-choices {
	justify-self: start;
	gap: 5px;
	padding: 0;
	border: none;
	background: none;
}

.setting-row-block .setting-choice {
	border: 1px solid var(--surface-border-color);
	background: var(--surface-muted-color);
}

.setting-row-block .setting-choice.active {
	border-color: var(--pill-color, #e36f94);
}

.setting-choice {
	padding: 4px 10px;
	border: none;
	border-radius: 6px;
	background: transparent;
	color: var(--font-sec-color, #747474);
	font-family: inherit;
	font-size: 12px;
	font-weight: 700;
	line-height: 1.35;
	white-space: nowrap;
	cursor: pointer;
	transition: background-color 0.12s, color 0.12s;
}

.setting-choice:hover:not(.active) {
	background: var(--fill-color);
	color: var(--font-color);
}

.setting-choice.active {
	background: var(--pill-color, #e36f94);
	color: #fff;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
</style>
