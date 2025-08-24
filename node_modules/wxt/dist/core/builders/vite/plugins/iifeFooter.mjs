export function iifeFooter(iifeReturnValueName) {
  return {
    name: "wxt:iife-footer",
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk" && chunk.isEntry) {
          chunk.code += `${iifeReturnValueName};`;
        }
      }
    }
  };
}
