import consola from "consola";
export function defineRunnerConfig(config) {
  consola.warn(
    "`defineRunnerConfig` is deprecated, use `defineWebExtConfig` instead. See https://wxt.dev/guide/resources/upgrading.html#v0-19-0-rarr-v0-20-0"
  );
  return defineWebExtConfig(config);
}
export function defineWebExtConfig(config) {
  return config;
}
