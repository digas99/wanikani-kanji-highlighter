import type { ContentScriptAnchoredOptions, ContentScriptPositioningOptions, BaseMountFunctions, ContentScriptUiOptions, MountFunctions } from './types';
export declare function applyPosition(root: HTMLElement, positionedElement: HTMLElement | undefined | null, options: ContentScriptPositioningOptions): void;
export declare function getAnchor(options: ContentScriptAnchoredOptions): Element | undefined;
export declare function mountUi(root: HTMLElement, options: ContentScriptAnchoredOptions): void;
export declare function createMountFunctions<TMounted>(baseFunctions: BaseMountFunctions, options: ContentScriptUiOptions<TMounted>): MountFunctions;
