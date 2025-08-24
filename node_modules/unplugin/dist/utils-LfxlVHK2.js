import fs from "node:fs";
import { basename, dirname, resolve } from "node:path";

//#region src/rspack/utils.ts
function encodeVirtualModuleId(id, plugin) {
	return resolve(plugin.__virtualModulePrefix, encodeURIComponent(id));
}
function decodeVirtualModuleId(encoded, _plugin) {
	return decodeURIComponent(basename(encoded));
}
function isVirtualModuleId(encoded, plugin) {
	return dirname(encoded) === plugin.__virtualModulePrefix;
}
var FakeVirtualModulesPlugin = class FakeVirtualModulesPlugin {
	name = "FakeVirtualModulesPlugin";
	static counters = /* @__PURE__ */ new Map();
	static {
		[
			"SIGINT",
			"SIGTERM",
			"SIGQUIT",
			"exit"
		].forEach((event) => {
			process.once(event, () => {
				this.counters.forEach((_, dir) => {
					fs.rmSync(dir, {
						recursive: true,
						force: true
					});
				});
			});
		});
	}
	constructor(plugin) {
		this.plugin = plugin;
	}
	apply(compiler) {
		const dir = this.plugin.__virtualModulePrefix;
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		const counter = FakeVirtualModulesPlugin.counters.get(dir) ?? 0;
		FakeVirtualModulesPlugin.counters.set(dir, counter + 1);
		compiler.hooks.shutdown.tap(this.name, () => {
			const counter$1 = (FakeVirtualModulesPlugin.counters.get(dir) ?? 1) - 1;
			if (counter$1 === 0) {
				FakeVirtualModulesPlugin.counters.delete(dir);
				fs.rmSync(dir, {
					recursive: true,
					force: true
				});
			} else FakeVirtualModulesPlugin.counters.set(dir, counter$1);
		});
	}
	async writeModule(file) {
		const path$1 = encodeVirtualModuleId(file, this.plugin);
		await fs.promises.writeFile(path$1, "");
		return path$1;
	}
};

//#endregion
export { FakeVirtualModulesPlugin, decodeVirtualModuleId, encodeVirtualModuleId, isVirtualModuleId };