import forestNumbers from "./forest-numbers.json";
import lakeAddition from "./lake-addition.json";
import mathCity from "./math-city.json";
import { BoardPack } from "../../models/BoardPack";
import { BoardPackValidator } from "../../services/BoardPackValidator";
import { questionBankRegistry } from "../questionBanks/QuestionBankRegistry";
import { DebugLogger } from "../../utils/DebugLogger";
import subtractionTrail from "./subtraction-trail.json";
import treasureIsland from "./treasure-island.json";
import grandMathJourney from "./grand-math-journey.json";

const manifests = [forestNumbers, lakeAddition, mathCity, subtractionTrail, treasureIsland, grandMathJourney] as unknown as BoardPack[];

class BoardPackRegistry {
    private readonly packs = new Map<string, BoardPack>();
    private readonly validator = new BoardPackValidator();

    constructor() {
        manifests.forEach(pack => {
            const result = this.validator.validate(pack);
            if (!result.valid) {
                DebugLogger.error("CONTENT", `Board pack ${pack.id} rejected`, result.errors);
                return;
            }
            if (this.packs.has(pack.id)) {
                DebugLogger.error("CONTENT", `Duplicate board pack id: ${pack.id}`);
                return;
            }

            const missingGroups = pack.path
                .filter(tile => tile.id < pack.path.length)
                .map(tile => tile.questionGroup)
                .filter((groupId): groupId is string => typeof groupId === "string" && groupId.length > 0)
                .filter(groupId => !questionBankRegistry.hasGroup(groupId));
            if (missingGroups.length > 0) {
                DebugLogger.error("CONTENT", `Board pack ${pack.id} has missing question groups`, missingGroups);
                return;
            }

            this.packs.set(pack.id, Object.freeze(pack));
        });

        if (this.packs.size === 0) throw new Error("No valid board packs are available.");
    }

    public getAll(): BoardPack[] { return Array.from(this.packs.values()); }
    public getById(id: string): BoardPack | undefined { return this.packs.get(id); }
    public getDefault(): BoardPack { return this.getById("forest-numbers") ?? this.getAll()[0]; }
}

export const boardPackRegistry = new BoardPackRegistry();
