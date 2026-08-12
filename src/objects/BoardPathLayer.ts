import Phaser from "phaser";
import { BoardPack } from "../models/BoardPack";
import { BoardBounds, BoardService } from "../services/BoardService";
import { BoardRenderer } from "./boardEngine/BoardRenderer";

/** @deprecated Compatibility wrapper around Board Engine 2.0. */
export class BoardPathLayer {
    private readonly renderer: BoardRenderer;
    constructor(scene: Phaser.Scene, service: BoardService, pack: BoardPack, bounds: BoardBounds) {
        this.renderer = new BoardRenderer(scene, service, pack, bounds);
    }
    public destroy(): void { this.renderer.destroy(); }
}
