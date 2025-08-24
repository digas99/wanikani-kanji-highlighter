import { ContentScriptContext } from '../content-script-context';
import type { ContentScriptUi, ContentScriptUiOptions } from './types';
/**
 * Create a content script UI inside a [`ShadowRoot`](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot).
 *
 * > This function is async because it has to load the CSS via a network call.
 *
 * @see https://wxt.dev/guide/essentials/content-scripts.html#shadow-root
 */
export declare function createShadowRootUi<TMounted>(ctx: ContentScriptContext, options: ShadowRootContentScriptUiOptions<TMounted>): Promise<ShadowRootContentScriptUi<TMounted>>;
export interface ShadowRootContentScriptUi<TMounted> extends ContentScriptUi<TMounted> {
    /**
     * The `HTMLElement` hosting the shadow root used to isolate the UI's styles. This is the element
     * that get's added to the DOM. This element's style is not isolated from the webpage.
     */
    shadowHost: HTMLElement;
    /**
     * The container element inside the `ShadowRoot` whose styles are isolated. The UI is mounted
     * inside this `HTMLElement`.
     */
    uiContainer: HTMLElement;
    /**
     * The shadow root performing the isolation.
     */
    shadow: ShadowRoot;
}
export type ShadowRootContentScriptUiOptions<TMounted> = ContentScriptUiOptions<TMounted> & {
    /**
     * The name of the custom component used to host the ShadowRoot. Must be kebab-case.
     */
    name: string;
    /**
     * Custom CSS text to apply to the UI. If your content script imports/generates CSS and you've
     * set `cssInjectionMode: "ui"`, the imported CSS will be included automatically. You do not need
     * to pass those styles in here. This is for any additional styles not in the imported CSS.
     */
    css?: string;
    /**
     * ShadowRoot's mode.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/mode
     * @default "open"
     */
    mode?: 'open' | 'closed';
    /**
     * When enabled, `event.stopPropagation` will be called on events trying to bubble out of the
     * shadow root.
     *
     * - Set to `true` to stop the propagation of a default set of events,
     *   `["keyup", "keydown", "keypress"]`
     * - Set to an array of event names to stop the propagation of a custom list of events
     */
    isolateEvents?: boolean | string[];
    /**
     * By default, WXT adds `all: initial` to the shadow root before the rest of
     * your CSS. This resets any inheritable CSS styles that
     * [normally pierce the Shadow DOM](https://open-wc.org/guides/knowledge/styling/styles-piercing-shadow-dom/).
     *
     * WXT resets everything but:
     * - **`rem` Units**: they continue to scale based off the webpage's HTML `font-size`.
     * - **CSS Variables/Custom Properties**: CSS variables defined outside the shadow root can be accessed inside it.
     * - **`@font-face` Definitions**: Fonts defined outside the shadow root can be used inside it.
     *
     * To disable this behavior and inherit styles from the webpage, set `inheritStyles: true`.
     *
     * @default false
     */
    inheritStyles?: boolean;
    /**
     * Callback executed when mounting the UI. This function should create and append the UI to the
     * `uiContainer` element. It is called every time `ui.mount()` is called.
     *
     * Optionally return a value that can be accessed at `ui.mounted` or in the `onRemove` callback.
     */
    onMount: (uiContainer: HTMLElement, shadow: ShadowRoot, shadowHost: HTMLElement) => TMounted;
};
