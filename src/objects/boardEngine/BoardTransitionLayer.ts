import Phaser from "phaser";
import { BoardPack, BoardPackTransition } from "../../models/BoardPack";
import { BoardService } from "../../services/BoardService";

export class BoardTransitionLayer {
    public readonly graphics: Phaser.GameObjects.Graphics;

    constructor(private readonly scene: Phaser.Scene, private readonly service: BoardService, pack: BoardPack) {
        this.graphics = scene.add.graphics();
        if (pack.layout.renderTransitions === false) return;
        pack.transitions.forEach(t => t.kind === "ladder" ? this.drawLadder(t) : this.drawSnake(t));
    }

    private points(t: BoardPackTransition): { from: Phaser.Math.Vector2; to: Phaser.Math.Vector2 } | undefined {
        const a = this.service.getTile(t.from); const b = this.service.getTile(t.to);
        return a && b ? { from: new Phaser.Math.Vector2(a.centerX, a.centerY), to: new Phaser.Math.Vector2(b.centerX, b.centerY) } : undefined;
    }

    private drawLadder(t: BoardPackTransition): void {
        const p = this.points(t); if (!p) return;
        const d = p.to.clone().subtract(p.from); const len = Math.max(1, d.length()); const u = d.clone().scale(1 / len);
        const n = new Phaser.Math.Vector2(-u.y, u.x).scale(10);
        const a1 = p.from.clone().add(n), a2 = p.to.clone().add(n), b1 = p.from.clone().subtract(n), b2 = p.to.clone().subtract(n);
        this.graphics.lineStyle(7, 0xf0b44d, 1).lineBetween(a1.x, a1.y, a2.x, a2.y).lineBetween(b1.x, b1.y, b2.x, b2.y);
        const count = Math.max(4, Math.floor(len / 42));
        for (let i = 1; i < count; i++) { const c = p.from.clone().lerp(p.to, i / count); const x = c.clone().add(n); const y = c.clone().subtract(n); this.graphics.lineStyle(5, 0xffd979, 1).lineBetween(x.x, x.y, y.x, y.y); }
    }

    private drawSnake(t: BoardPackTransition): void {
        const p = this.points(t); if (!p) return;
        const d = p.to.clone().subtract(p.from); const len = Math.max(1, d.length()); const u = d.clone().scale(1 / len); const n = new Phaser.Math.Vector2(-u.y, u.x);
        const points: Phaser.Math.Vector2[] = []; const segments = Math.max(18, Math.floor(len / 12)); const amp = Math.min(34, Math.max(18, len * 0.12));
        for (let i = 0; i <= segments; i++) { const q = i / segments; points.push(p.from.clone().lerp(p.to, q).add(n.clone().scale(Math.sin(q * Math.PI * 4) * amp * Math.sin(q * Math.PI)))); }
        const color = t.from % 2 === 0 ? 0x6fbf55 : 0xe36f78;
        this.graphics.lineStyle(13, color, 1).beginPath().moveTo(points[0].x, points[0].y); points.slice(1).forEach(v => this.graphics.lineTo(v.x, v.y)); this.graphics.strokePath();
        this.graphics.fillStyle(color, 1).fillCircle(p.from.x, p.from.y, 16);
    }
}
