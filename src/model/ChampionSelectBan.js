import defaultPluginConfig from "../config.json";
import { ChampionSelectBase } from "./ChampionSelectBase.js";

export class ChampionSelectBan extends ChampionSelectBase {
    constructor(options = {}) {
        super({ ...options, logPrefix: options.logPrefix || "ChampionSelectBan" });
    }

    async task() {
        const banConfig = DataStore.get("controladoBan") || defaultPluginConfig.controladoBan;
        if (!banConfig.enabled) {
            console.debug("auto-champion-select(ChampionSelectBan.task): Ban is disabled, skipping...");
            return;
        }
        const localPlayerSubActions = this.getLocalPlayerSubActions("ban");
        if (localPlayerSubActions.length === 0) {
            console.debug("auto-champion-select(ChampionSelectBan.task): No local player ban actions found, skipping...");
            this.unmount();
            return;
        }
        console.debug(`auto-champion-select(ChampionSelectBan.task): Found ${localPlayerSubActions.length} local player ban action(s)`);
        for (const subAction of localPlayerSubActions) {
            const champions = banConfig.champions;
            console.debug(`auto-champion-select(ChampionSelectBan.task): Processing ban action with ${champions.length} champion(s): ${champions.join(", ")}`);
            for (const championId of champions) {
                if (this.shouldSkipChampion(championId, subAction)) {
                    continue;
                }
                console.debug(`auto-champion-select(ChampionSelectBan.task): Attempting to ban champion ID: ${championId}...`);
                const response = await this.selectChampion(subAction.id, championId);
                if (!response.ok) {
                    console.error(`auto-champion-select(ChampionSelectBan.task): Failed to ban champion ${championId}. Status: ${response.status}`);
                    return;
                }
                console.debug(`auto-champion-select(ChampionSelectBan.task): Successfully completed ban for champion ID: ${championId}`);
                break;
            }
        }
    }
}
