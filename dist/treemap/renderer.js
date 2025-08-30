import { COLOR_SCALE, COLORS, LAYOUT, FONT } from './constants.js';
export class CanvasRenderer {
    render(nodes, context) {
        nodes.forEach((node) => {
            if (!node.parent)
                return;
            const nodeWidth = node.x1 - node.x0;
            const nodeHeight = node.y1 - node.y0;
            if (nodeWidth < 2 || nodeHeight < 2)
                return;
            this.renderNode(node, nodeWidth, nodeHeight, context);
        });
    }
    renderNode(node, width, height, context) {
        const isLeaf = !node.children || node.children.length === 0;
        const data = isLeaf ? node.data.data : node.data;
        const change = isLeaf ? (data?.priceChangePct || 0) : (data?.priceChangePct || 0);
        context.fillStyle = COLOR_SCALE(change);
        context.fillRect(node.x0, node.y0, width, height);
        context.strokeStyle = COLORS.SECTOR_STROKE;
        context.lineWidth = 1;
        context.strokeRect(node.x0, node.y0, width, height);
        if (width > 30 && height > 20) {
            this.renderNodeText(node, width, height, isLeaf, change, context);
        }
    }
    renderNodeText(node, width, height, isLeaf, change, context) {
        context.save();
        context.fillStyle = COLORS.TEXT_WHITE;
        context.textAlign = 'left';
        context.textBaseline = 'top';
        const padding = LAYOUT.PADDING.TEXT;
        const textX = node.x0 + padding;
        const textY = node.y0 + padding;
        const maxWidth = width - (padding * 2);
        if (isLeaf) {
            const nodeArea = width * height;
            const baseFontSize = Math.max(2, Math.min(12, Math.sqrt(nodeArea) / 15));
            const ticker = node.data.data?.ticker || '';
            const name = node.data.data?.nameEng || ticker;
            const price = Number(node.data.data?.priceLastSale) || 0;
            const changeValue = Number(node.data.data?.priceChangePct) || 0;
            const marketCap = Number(node.data.data?.marketCap) || 0;
            let currentY = textY;
            const lineHeight = Math.round(baseFontSize * 1.2);
            context.font = `bold ${baseFontSize}px ${FONT.FAMILY}`;
            this.drawWrappedText(ticker, textX, currentY, maxWidth, lineHeight, 1, context);
            currentY += lineHeight + 2;
            if (height > baseFontSize * 5) {
                context.font = `${baseFontSize}px ${FONT.FAMILY}`;
                const nameLines = this.drawWrappedText(name, textX, currentY, maxWidth, lineHeight, 2, context);
                currentY += (nameLines * lineHeight) + 2;
            }
            if (height > baseFontSize * 7) {
                context.font = `${baseFontSize}px ${FONT.FAMILY}`;
                const changeText = `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%`;
                this.drawWrappedText(`${price} (${changeText})`, textX, currentY, maxWidth, lineHeight, 1, context);
                currentY += lineHeight + 2;
            }
            if (height > baseFontSize * 9) {
                context.font = `${baseFontSize}px ${FONT.FAMILY}`;
                const capText = `Cap: ${d3.format(',.0f')((marketCap || 0) / 1e6)}M`;
                this.drawWrappedText(capText, textX, currentY, maxWidth, lineHeight, 1, context);
            }
        }
        else {
            const sectorData = node.data.data || node.data;
            const sectorName = sectorData?.nameEng || sectorData?.ticker || '';
            context.font = `12px ${FONT.FAMILY}`;
            context.fillStyle = COLORS.TEXT_WHITE;
            context.textAlign = 'left';
            context.textBaseline = 'top';
            context.shadowColor = COLORS.TEXT_SHADOW;
            context.shadowBlur = 2;
            context.shadowOffsetX = 1;
            context.shadowOffsetY = 1;
            this.drawWrappedText(sectorName, textX, textY, maxWidth, 20, 1, context);
            context.shadowColor = 'transparent';
            context.shadowBlur = 0;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;
        }
        context.restore();
    }
    drawWrappedText(text, x, y, maxWidth, lineHeight, maxLines, context) {
        const words = text.split(' ');
        let line = '';
        let lineCount = 0;
        let currentY = y;
        for (let i = 0; i < words.length && lineCount < maxLines; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = context.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
                context.fillText(line.trim(), x, currentY);
                lineCount++;
                currentY += lineHeight;
                line = words[i] + ' ';
            }
            else {
                line = testLine;
            }
        }
        if (line.trim() && lineCount < maxLines) {
            context.fillText(line.trim(), x, currentY);
            lineCount++;
        }
        return lineCount;
    }
}
//# sourceMappingURL=renderer.js.map