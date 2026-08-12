import Phaser from "phaser";
import { BoardPack } from "../../models/BoardPack";
import { BoardBounds, BoardService } from "../../services/BoardService";
import { Theme } from "../../theme/Theme";
import { mixColors, parseHex } from "./BoardRenderUtils";

export class BoardTileLayer {
    public readonly containers: Phaser.GameObjects.Container[] = [];

    constructor(private readonly scene: Phaser.Scene, service: BoardService, pack: BoardPack, bounds: BoardBounds) {
        if (!pack.layout.renderTiles) return;
        const fill = parseHex(pack.theme.tileFill, 0xfff7d6); const stroke = parseHex(pack.theme.tileStroke, Theme.colors.goldDark); const accent = parseHex(pack.theme.accent, 0xf6d36b);
        const scale = Math.min(bounds.width / pack.layout.referenceWidth, bounds.height / pack.layout.referenceHeight);
        const radius = Math.max(18, pack.layout.tileRadius * scale); const journey = pack.id === "grand-math-journey";
        const width = journey ? Math.max(34, radius * 1.55) : Math.max(68, radius * 2.15); const height = journey ? Math.max(30, radius * 1.25) : Math.max(52, radius * 1.45);
        service.getTiles().forEach(tile => {
            const g = scene.add.graphics(); const tileFill = tile.type === "start" ? 0xcff2c6 : tile.type === "finish" ? 0xffd4cc : tile.id % 2 === 0 ? fill : mixColors(fill, accent, 0.10);
            g.fillStyle(0x000000, 0.22).fillRoundedRect(-width / 2 + 4, -height / 2 + 6, width, height, 12);
            g.fillStyle(tileFill, 1).fillRoundedRect(-width / 2, -height / 2, width, height, 12);
            g.lineStyle(3, stroke, 0.92).strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
            const label = scene.add.text(0, 0, String(tile.id), { fontFamily: Theme.fonts.family, fontSize: `${journey ? Math.max(13, Math.round(radius * .58)) : Math.max(22, Math.round(radius * .82))}px`, fontStyle: "bold", color: "#14243a", stroke: "#ffffff", strokeThickness: journey ? 1 : 2, rtl: true, align: "center" }).setOrigin(.5);
            this.containers.push(scene.add.container(tile.centerX, tile.centerY, [g, label]));
        });
    }

    public destroy(): void { this.containers.forEach(c => c.destroy(true)); this.containers.length = 0; }
}
