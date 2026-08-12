import Phaser from "phaser";
import { BoardPack } from "../../models/BoardPack";
import { BoardBounds, BoardService } from "../../services/BoardService";
import { parseHex } from "./BoardRenderUtils";

export class BoardConnectorLayer {
    public readonly graphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, service: BoardService, pack: BoardPack, bounds: BoardBounds) {
        this.graphics = scene.add.graphics();
        const tiles = service.getTiles();
        if (!pack.layout.renderPath || tiles.length < 2) return;
        const scale = Math.min(bounds.width / pack.layout.referenceWidth, bounds.height / pack.layout.referenceHeight);
        const width = Math.max(8, pack.layout.tileRadius * scale * 0.75);
        const color = parseHex(pack.theme.pathStroke, 0xf6d36b);
        this.stroke(tiles, width + 5, 0x10243d, 0.42);
        this.stroke(tiles, width, color, 0.92);
    }

    private stroke(tiles: readonly { centerX: number; centerY: number }[], width: number, color: number, alpha: number): void {
        this.graphics.lineStyle(width, color, alpha);
        this.graphics.beginPath();
        this.graphics.moveTo(tiles[0].centerX, tiles[0].centerY);
        tiles.slice(1).forEach(tile => this.graphics.lineTo(tile.centerX, tile.centerY));
        this.graphics.strokePath();
    }
}
