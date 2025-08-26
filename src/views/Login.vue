<template>
	<div>
		<div class="logo-container">
			<img :src="logo" alt="Logo" />
			<span>Wanikani Kanji Highlighter</span>
		</div>
		<form @submit.prevent="login">
			<div class="input-container">
				<input v-model="apiKey" id="apiKey" placeholder="Enter Wanikani API Key" type="text" required />
			</div>
			<button type="submit">Login</button>
			<div class="bottom">
				<a href="https://www.wanikani.com/settings/personal_access_tokens" target="_blank">Find API Key</a>
				<span class="version">v{{ version }}</span>
			</div>
		</form>
	</div>
</template>

<script>
import { ref } from "vue";

import logo from "@/assets/logo.png";

export default {
	data() {
		return {
			apiKey: import.meta.env.VITE_WANIKANI_API_KEY || "",
			proxyServer: "https://proxy.wkhighlighter.com",
			version: ref(chrome.runtime.getManifest().version),
			logo
		};
	},

	mounted() {
		document.body.style.paddingRight = "unset";
		document.body.style.minHeight = "unset";
		document.body.style.marginTop = "unset";
	},

	beforeUnmount() {
		document.body.style.paddingRight = null;
		document.body.style.minHeight = null;
		document.body.style.marginTop = null;
	},

	methods: {
		login() {
			this.$emit("login", this.apiKey, this.proxyServer);
		},
	},
};
</script>

<style scoped>
.logo-container {
	display: flex;
	justify-content: center;
	padding: 10px 0;
	background-color: var(--default-color);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
}

.logo-container img {
	max-width: 35%;
	height: auto;
}

.logo-container span {
	font-size: 17px;
	font-weight: bold;
	color: white;
	padding: 5px 0;
}

form {
	text-align: center;
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.input-container {}

input {
	width: 90%;
	margin: auto;
	padding: 10px 15px;
	border: none;
	outline: none;
	border-bottom: 1px solid var(--default-color);
	text-align: center;
}

button {
	background-color: var(--default-color);
	color: white;
	border: none;
	padding: 10px;
	border-radius: 50px;
	cursor: pointer;
	width: 30%;
	margin: auto;
}

button:hover {
	background-color: var(--wanikani);
}

.version {
	font-size: 12px;
	color: silver;
}

.bottom {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
}
</style>

<style>
body {
	padding: unset;
}
</style>