import Phaser from "phaser";
import { BoardPack } from "../../models/BoardPack";
import { BoardBounds, BoardService } from "../../services/BoardService";
import { BoardConnectorLayer } from "./BoardConnectorLayer";
import { BoardTileLayer } from "./BoardTileLayer";
import { BoardTransitionLayer } from "./BoardTransitionLayer";

/** Board Engine 2.0: runtime composition of path, transitions and learning tiles. */
export class BoardRenderer {
    private readonly container: Phaser.GameObjects.Container;
    private readonly tiles: BoardTileLayer;

    constructor(scene: Phaser.Scene, service: BoardService, pack: BoardPack, bounds: BoardBounds, depth = 5) {
        this.container = scene.add.container(0, 0).setDepth(depth);
        const connectors = new BoardConnectorLayer(scene, service, pack, bounds);
        const transitions = new BoardTransitionLayer(scene, service, pack);
        this.tiles = new BoardTileLayer(scene, service, pack, bounds);
        this.container.add([connectors.graphics, transitions.graphics, ...this.tiles.containers]);
    }

    public destroy(): void { this.tiles.destroy(); this.container.destroy(true); }
}
