export const deno = {
  overridesKey: "na",
  downloadDependency() {
    throw Error("Deno not supported");
  },
  listDependencies() {
    throw Error("Deno not supported");
  }
};
