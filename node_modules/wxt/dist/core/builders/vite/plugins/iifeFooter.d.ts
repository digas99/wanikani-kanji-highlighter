import type { Plugin } from 'vite';
/**
 * Add a footer with the returned value so it can return values to `scripting.executeScript`
 * Footer is added a part of esbuild to make sure it's not minified. It
 * get's removed if added to `build.rollupOptions.output.footer`
 * See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/executeScript#return_value
 */
export declare function iifeFooter(iifeReturnValueName: string): Plugin;
