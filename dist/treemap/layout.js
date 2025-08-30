// ToDo: Consider moving to index.ts
import { LAYOUT } from './constants.js';
export function getCanvasSize(container) {
    const devicePixelRatio = window.devicePixelRatio || 1;
    return {
        width: container.width * devicePixelRatio,
        height: (container.height - LAYOUT.PATHBAR_HEIGHT - LAYOUT.FOOTER_HEIGHT) * devicePixelRatio
    };
}
export function getViewportSize(container) {
    return {
        width: container.width,
        height: container.height - LAYOUT.PATHBAR_HEIGHT - LAYOUT.FOOTER_HEIGHT
    };
}
//# sourceMappingURL=layout.js.map