export function devServerGlobals(config, server) {
  return {
    name: "wxt:dev-server-globals",
    config() {
      if (server == null || config.command == "build") return;
      return {
        define: {
          __DEV_SERVER_ORIGIN__: JSON.stringify(
            server.origin.replace(/^http(s?):/, "ws$1:")
          )
        }
      };
    }
  };
}
