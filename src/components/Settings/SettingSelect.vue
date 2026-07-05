<template>
	<div class="setting-row">
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
			<option
				v-for="option in options"
				:key="String(optionValue(option))"
				:value="optionValue(option)"
			>
				{{ optionLabel(option) }}
			</option>
		</select>
	</div>
</template>

<script>
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
	},

	emits: ['update:modelValue'],

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
	},
};
</script>
