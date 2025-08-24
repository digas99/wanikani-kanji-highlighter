import { ContentScriptContext } from '../content-script-context';
import type { ContentScriptUi, ContentScriptUiOptions } from './types';
/**
 * Create a content script UI using an iframe.
 *
 * @see https://wxt.dev/guide/essentials/content-scripts.html#iframe
 */
export declare function createIframeUi<TMounted>(ctx: ContentScriptContext, options: IframeContentScriptUiOptions<TMounted>): IframeContentScriptUi<TMounted>;
export interface IframeContentScriptUi<TMounted> extends ContentScriptUi<TMounted> {
    /**
     * The iframe added to the DOM.
     */
    iframe: HTMLIFrameElement;
    /**
     * A wrapper div that assists in positioning.
     */
    wrapper: HTMLDivElement;
}
export type IframeContentScriptUiOptions<TMounted> = ContentScriptUiOptions<TMounted> & {
    /**
     * The path to the HTML page that will be shown in the iframe. This string is passed into
     * `browser.runtime.getURL`.
     */
    page: import('wxt/browser').HtmlPublicPath;
    /**
     * Callback executed when mounting the UI. Use this function to customize the iframe or wrapper
     * element's appearance. It is called every time `ui.mount()` is called.
     *
     * Optionally return a value that can be accessed at `ui.mounted` or in the `onRemove` callback.
     */
    onMount?: (wrapper: HTMLElement, iframe: HTMLIFrameElement) => TMounted;
};
