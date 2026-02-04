import defaultPluginConfig from "../config.json";
import { ChampionSelectBase } from "./ChampionSelectBase.js";

export class ChampionSelectPick extends ChampionSelectBase {
    constructor(options = {}) {
        super({ ...options, logPrefix: options.logPrefix || "ChampionSelectPick" });
    }

    getPickChampionsForRole() {
        const primaryRoleConfig = DataStore.get("controladoPrimaryRole") || defaultPluginConfig.controladoPrimaryRole;
        const secondaryRoleConfig = DataStore.get("controladoSecondaryRole") || defaultPluginConfig.controladoSecondaryRole;
        if (primaryRoleConfig.role && this.currentRole.value === primaryRoleConfig.role) {
            console.debug(`auto-champion-select(getPickChampionsForRole): Matched primary role "${primaryRoleConfig.role}", using picks: ${primaryRoleConfig.picks.join(", ")}`);
            return primaryRoleConfig.picks;
        }
        if (secondaryRoleConfig.role && this.currentRole.value === secondaryRoleConfig.role) {
            console.debug(`auto-champion-select(getPickChampionsForRole): Matched secondary role "${secondaryRoleConfig.role}", using picks: ${secondaryRoleConfig.picks.join(", ")}`);
            return secondaryRoleConfig.picks;
        }
        console.debug(`auto-champion-select(getPickChampionsForRole): No role match found for "${this.currentRole.value}", returning null`);
        return null;
    }

    async task() {
        const pickConfig = DataStore.get("controladoPick") || defaultPluginConfig.controladoPick;
        if (!pickConfig.enabled) {
            console.debug("auto-champion-select(ChampionSelectPick.task): Pick is disabled, skipping...");
            return;
        }
        const localPlayerSubActions = this.getLocalPlayerSubActions("pick");
        if (localPlayerSubActions.length === 0) {
            console.debug("auto-champion-select(ChampionSelectPick.task): No local player pick actions found, skipping...");
            this.unmount();
            return;
        }
        console.debug(`auto-champion-select(ChampionSelectPick.task): Found ${localPlayerSubActions.length} local player pick action(s)`);
        for (const subAction of localPlayerSubActions) {
            const champions = this.getPickChampionsForRole() || pickConfig.champions;
            console.debug(`auto-champion-select(ChampionSelectPick.task): Processing pick action with ${champions.length} champion(s): ${champions.join(", ")}`);
            for (const championId of champions) {
                if (this.shouldSkipChampion(championId, subAction)) {
                    continue;
                }
                console.debug(`auto-champion-select(ChampionSelectPick.task): Attempting to pick champion ID: ${championId}...`);
                const response = await this.selectChampion(subAction.id, championId);
                if (!response.ok) {
                    console.error(`auto-champion-select(ChampionSelectPick.task): Failed to pick champion ${championId}. Status: ${response.status}`);
                    return;
                }
                console.debug(`auto-champion-select(ChampionSelectPick.task): Successfully completed pick for champion ID: ${championId}`);
                break;
            }
        }
    }
}
