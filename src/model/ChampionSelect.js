import { AssignedRole } from "./AssignedRole.js";
import defaultPluginConfig from "../config.json";
import { request, sleep } from "https://cdn.jsdelivr.net/npm/balaclava-utils@latest";

export class ChampionSelect {
    constructor() {
        this.session = null;
        this.actions = null;
        this.localPlayerCellId = null;
        this.teamIntents = null;
        this.currentRole = AssignedRole.UNASSIGNED;
        this.allBans = null;
        this.mounted = false;
        this.watchRunning = false;
        this.watch();
    }

    mount() {
        console.debug("auto-champion-select(ChampionSelect.mount): Champion select mounted, starting auto-pick/ban");
        this.mounted = true;
    }

    unmount() {
        console.debug("auto-champion-select(ChampionSelect.unmount): Champion select unmounted");
        this.mounted = false;
    }

    stopWatch() {
        this.watchRunning = false;
    }

    async watch() {
        this.watchRunning = true;
        console.debug("auto-champion-select(watch): Watch loop started");
        while (this.watchRunning) {
            if (this.mounted) {
                console.debug("auto-champion-select(watch): Mounted and executing task...");
                await this.updateProperties();
                await this.task();
            }
            await sleep(300);
        }
        console.debug("auto-champion-select(watch): Watch loop stopped");
    }

    async updateProperties() {
        try {
            const sessionResponse = await request("GET", "/lol-champ-select/v1/session");
            this.session = await sessionResponse.json();
            this.actions = this.session.actions;
            this.localPlayerCellId = this.session.localPlayerCellId;
            this.allPicks = [...this.session.myTeam, ...this.session.theirTeam];
            this.allBans = [...this.session.bans.myTeamBans, ...this.session.bans.theirTeamBans];
            this.teamIntents = this.session.myTeam.map(player => player.championPickIntent);
            this.currentRole = this.getAssignedRole(this.session.myTeam, this.localPlayerCellId);
            console.debug(`auto-champion-select(updateProperties): Identified player role as: "${this.currentRole.value || 'UNASSIGNED'}"`);
        } catch (error) {
            console.error("auto-champion-select(updateProperties): Error updating session properties:", error);
        }
    }

    getAssignedRole(myTeam, localPlayerCellId) {
        const localPlayer = myTeam.find(player => player.cellId === localPlayerCellId);
        if (!localPlayer) {
            return AssignedRole.UNASSIGNED;
        }
        return AssignedRole.from_session(localPlayer.assignedPosition);
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

    isChampionAlreadyBanned(championId) {
        return this.allBans.some(bannedChampionId => bannedChampionId === championId);
    }

    isChampionAlreadyPicked(championId) {
        return this.allPicks.some(player => player.championId === championId);
    }

    isChampionInTeamIntents(championId) {
        return this.teamIntents.some(playerIntent => playerIntent === championId);
    }

    shouldSkipChampion(championId, subAction) {
        if (this.isChampionAlreadyBanned(championId)) {
            console.debug(`auto-champion-select: ${subAction.type} ${championId} but it's already banned, skipping...`);
            return true;
        }
        if (subAction.type === "ban" && this.isChampionInTeamIntents(championId)) {
            const banConfig = DataStore.get("controladoBan") || defaultPluginConfig.controladoBan;
            if (!banConfig.force) {
                console.debug(`auto-champion-select: Banning ${championId} but it's already picked, skipping...`);
                return true;
            } else {
                console.debug(`auto-champion-select: Banning ${championId} but it's already picked, forcing...`);
            }
        }
        if (subAction.type === "pick" && this.isChampionAlreadyPicked(championId)) {
            const pickConfig = DataStore.get("controladoPick") || defaultPluginConfig.controladoPick;
            if (!pickConfig.force) {
                console.debug(`auto-champion-select: Picking ${championId} but it's already picked, skipping...`);
                return true;
            } else {
                console.debug(`auto-champion-select: Picking ${championId} but it's already picked, forcing...`);
            }
        }
        return false;
    }

    async task() {
        const pickConfig = DataStore.get("controladoPick") || defaultPluginConfig.controladoPick;
        const banConfig = DataStore.get("controladoBan") || defaultPluginConfig.controladoBan;
        if (!pickConfig.enabled && !banConfig.enabled) {
            console.debug("auto-champion-select(task): Both pick and ban are disabled, skipping...");
            return;
        }
        const localPlayerSubActions = this.getLocalPlayerSubActions();
        if (localPlayerSubActions.length === 0) {
            console.debug("auto-champion-select(task): No local player sub actions found, skipping...");
            this.unmount();
            return;
        }
        console.debug(`auto-champion-select(task): Found ${localPlayerSubActions.length} local player sub action(s)`);
        for (const subAction of localPlayerSubActions) {
            const config = subAction.type === "pick" ? pickConfig : banConfig;
            if (!config.enabled) {
                console.debug(`auto-champion-select(task): ${subAction.type === 'pick' ? 'Pick' : 'Ban'} is disabled, skipping...`);
                continue;
            }
            const champions = subAction.type === "pick" 
                ? (this.getPickChampionsForRole() || pickConfig.champions)
                : banConfig.champions;
            console.debug(`auto-champion-select(task): Processing ${subAction.type} action with ${champions.length} champion(s): ${champions.join(", ")}`);
            for (const championId of champions) {
                if (this.shouldSkipChampion(championId, subAction)) {
                    continue;
                }
                console.debug(`auto-champion-select(task): Attempting to ${subAction.type} champion ID: ${championId}...`);
                const response = await this.selectChampion(subAction.id, championId);
                if (!response.ok) {
                    console.error(`auto-champion-select(task): Failed to ${subAction.type} champion ${championId}. Status: ${response.status}`);
                    return;
                }
                console.debug(`auto-champion-select(task): Successfully completed ${subAction.type} for champion ID: ${championId}`);
                break;
            }
        }
    }

    getLocalPlayerSubActions() {
        const subActions = this.actions.flat().filter(subAction =>
            subAction.actorCellId === this.localPlayerCellId &&
            subAction.completed === false
        ).sort(
            (a, b) => {
                const aPriority = a.type === "pick" ? 0 : 1;
                const bPriority = b.type === "pick" ? 0 : 1;
                return aPriority - bPriority;
            }
        );
        if (subActions.length > 0) {
            const actionTypes = subActions.map(a => a.type).join(", ");
            console.debug(`auto-champion-select(getLocalPlayerSubActions): Found ${subActions.length} pending action(s): [${actionTypes}]`);
        }
        return subActions;
    }

    selectChampion(actionId, championId) {
        const endpoint = `/lol-champ-select/v1/session/actions/${actionId}`;
        const body = { championId: championId, completed: true };
        console.debug(`auto-champion-select(selectChampion): Sending PATCH request to ${endpoint} with body:`, body);
        return request("PATCH", endpoint, { body });
    }
}
