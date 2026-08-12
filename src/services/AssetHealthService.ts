import Phaser from "phaser";
import { boardPackRegistry } from "../data/boardPacks/BoardPackRegistry";
import { getBoardPreviewKey } from "../loaders/BoardLoader";
import { AssetKeys } from "../core/AssetKeys";

export interface AssetHealthReport {
    ok: boolean;
    missing: string[];
}

/** Runtime preflight that prevents entering the game with missing critical artwork. */
export class AssetHealthService {
    public static inspect(scene: Phaser.Scene): AssetHealthReport {
        const required = new Set<string>([AssetKeys.Brand.LOGO]);
        boardPackRegistry.getAll().forEach(board => {
            required.add(board.assetKey);
            required.add(getBoardPreviewKey(board.id));
        });

        const missing = [...required].filter(key => {
            if (!scene.textures.exists(key)) return true;
            const texture = scene.textures.get(key);
            const source = texture.getSourceImage() as { width?: number; height?: number } | undefined;
            return !source || Number(source.width) < 2 || Number(source.height) < 2;
        });

        return { ok: missing.length === 0, missing };
    }
}
