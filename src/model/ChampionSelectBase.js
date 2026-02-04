import { AssignedRole } from "./AssignedRole.js";
import defaultPluginConfig from "../config.json";
import { request, sleep } from "https://cdn.jsdelivr.net/npm/balaclava-utils@latest";

export class ChampionSelectBase {
    constructor(options = {}) {
        this.session = null;
        this.actions = null;
        this.localPlayerCellId = null;
        this.teamIntents = null;
        this.currentRole = AssignedRole.UNASSIGNED;
        this.allBans = null;
        this.allPicks = null;
        this.mounted = false;
        this.watchRunning = false;
        this.logPrefix = options.logPrefix || "ChampionSelect";
        this.autoStartWatch = options.autoStartWatch !== false;
        if (this.autoStartWatch) {
            this.watch();
        }
    }

    mount() {
        console.debug(`auto-champion-select(${this.logPrefix}.mount): Champion select mounted`);
        this.mounted = true;
    }

    unmount() {
        console.debug(`auto-champion-select(${this.logPrefix}.unmount): Champion select unmounted`);
        this.mounted = false;
    }

    stopWatch() {
        this.watchRunning = false;
    }

    async watch() {
        this.watchRunning = true;
        console.debug(`auto-champion-select(${this.logPrefix}.watch): Watch loop started`);
        while (this.watchRunning) {
            if (this.mounted) {
                console.debug(`auto-champion-select(${this.logPrefix}.watch): Mounted and executing task...`);
                await this.updateProperties();
                await this.task();
            }
            await sleep(300);
        }
        console.debug(`auto-champion-select(${this.logPrefix}.watch): Watch loop stopped`);
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
            console.debug(`auto-champion-select(${this.logPrefix}.updateProperties): Identified player role as: "${this.currentRole.value || "UNASSIGNED"}"`);
        } catch (error) {
            console.error(`auto-champion-select(${this.logPrefix}.updateProperties): Error updating session properties:`, error);
        }
    }

    getAssignedRole(myTeam, localPlayerCellId) {
        const localPlayer = myTeam.find(player => player.cellId === localPlayerCellId);
        if (!localPlayer) {
            return AssignedRole.UNASSIGNED;
        }
        return AssignedRole.from_session(localPlayer.assignedPosition);
    }

    isChampionAlreadyBanned(championId) {
        return this.allBans?.some(bannedChampionId => bannedChampionId === championId) ?? false;
    }

    isChampionAlreadyPicked(championId) {
        return this.allPicks?.some(player => player.championId === championId) ?? false;
    }

    isChampionInTeamIntents(championId) {
        return this.teamIntents?.some(playerIntent => playerIntent === championId) ?? false;
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

    getLocalPlayerSubActions(filterType = null) {
        if (!this.actions) {
            return [];
        }
        const subActions = this.actions
            .flat()
            .filter(subAction =>
                subAction.actorCellId === this.localPlayerCellId &&
                subAction.completed === false &&
                (filterType ? subAction.type === filterType : true)
            );
        if (subActions.length > 0) {
            const actionTypes = subActions.map(a => a.type).join(", ");
            console.debug(`auto-champion-select(${this.logPrefix}.getLocalPlayerSubActions): Found ${subActions.length} pending action(s): [${actionTypes}]`);
        }
        return subActions;
    }

    selectChampion(actionId, championId) {
        const endpoint = `/lol-champ-select/v1/session/actions/${actionId}`;
        const body = { championId: championId, completed: true };
        console.debug(`auto-champion-select(${this.logPrefix}.selectChampion): Sending PATCH request to ${endpoint} with body:`, body);
        return request("PATCH", endpoint, { body });
    }

    async task() {
        throw new Error("ChampionSelectBase.task() must be implemented by a subclass.");
    }
}
