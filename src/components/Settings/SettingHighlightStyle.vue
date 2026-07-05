<template>
	<div class="setting-row setting-row-block setting-row-styles-only">
		<label v-if="label" class="settings-item-label">{{ label }}</label>
		<div class="highlight-options setting-control" :style="color ? { '--sample-color': color } : {}">
			<button
				v-for="option in options"
				:key="option.value"
				type="button"
				class="settings-highlight-style-option clickable"
				:class="[option.sampleClass, { picked: modelValue === option.value }]"
				:title="option.title"
				@click="$emit('update:modelValue', option.value)"
			>
				A
			</button>
		</div>
	</div>
</template>

<script>
export default {
	name: 'SettingHighlightStyle',

	props: {
		modelValue: {
			type: String,
			required: true,
		},
		label: {
			type: String,
			default: '',
		},
		color: {
			type: String,
			default: '',
		},
		options: {
			type: Array,
			required: true,
		},
	},

	emits: ['update:modelValue'],
};
</script>
