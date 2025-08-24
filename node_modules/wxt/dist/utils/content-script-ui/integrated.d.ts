/** @module wxt/utils/content-script-ui/integrated */
import { ContentScriptContext } from '../content-script-context';
import type { ContentScriptUi, ContentScriptUiOptions } from './types';
/**
 * Create a content script UI without any isolation.
 *
 * @see https://wxt.dev/guide/essentials/content-scripts.html#integrated
 */
export declare function createIntegratedUi<TMounted>(ctx: ContentScriptContext, options: IntegratedContentScriptUiOptions<TMounted>): IntegratedContentScriptUi<TMounted>;
/**
 * Shared types for the different `wxt/utils/content-script-ui/*` modules.
 * @module wxt/utils/content-script-ui/types
 */
export interface IntegratedContentScriptUi<TMounted> extends ContentScriptUi<TMounted> {
    /**
     * A wrapper div that assists in positioning.
     */
    wrapper: HTMLElement;
}
export type IntegratedContentScriptUiOptions<TMounted> = ContentScriptUiOptions<TMounted> & {
    /**
     * Tag used to create the wrapper element.
     *
     * @default "div"
     */
    tag?: string;
    /**
     * Callback executed when mounting the UI. This function should create and append the UI to the
     * `wrapper` element. It is called every time `ui.mount()` is called.
     *
     * Optionally return a value that can be accessed at `ui.mounted` or in the `onRemove` callback.
     */
    onMount: (wrapper: HTMLElement) => TMounted;
};
