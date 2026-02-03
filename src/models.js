import { request, sleep } from "https://cdn.jsdelivr.net/npm/balaclava-utils@latest";
import defaultPluginConfig from "./config.json";

/**
 * @author balaclava
 * @name auto-champion-select
 * @link https://github.com/controlado/auto-champion-select
 * @description Pick or ban automatically! 🐧
 */

export class AssignedRole {
    constructor(value) {
        this.value = value;
    }

    static TOP = new AssignedRole("top");
    static JUNGLE = new AssignedRole("jungle");
    static MIDDLE = new AssignedRole("middle");
    static BOTTOM = new AssignedRole("bottom");
    static UTILITY = new AssignedRole("utility");
    static UNASSIGNED = new AssignedRole(null);

    static from_session(assignedPosition) {
        switch (assignedPosition) {
            case "top":
                return this.TOP;
            case "jungle":
                return this.JUNGLE;
            case "middle":
                return this.MIDDLE;
            case "bottom":
                return this.BOTTOM;
            case "utility":
                return this.UTILITY;
            default:
                return this.UNASSIGNED;
        }
    }
}

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


export class Dropdown {
    constructor(text, configKey, configIndex, championsFunction) {
        this.element = document.createElement("lol-uikit-framed-dropdown");
        this.element.classList.add("dropdown-champions-default");

        this.text = text;

        this.config = null;
        this.configKey = configKey;
        this.configIndex = configIndex;

        this.championsFunction = championsFunction;
        this.champions = null;
    }

    async setup() {
        this.champions = await this.championsFunction();
        this.config = DataStore.get(this.configKey) || defaultPluginConfig[this.configKey];

        // Support both 'champions' and 'picks' array names (for role-based configs)
        const championsArray = this.config.champions || this.config.picks || [];
        
        if (!this.champions.some(champion => championsArray[this.configIndex] === champion.id)) {
            const arrayName = this.config.champions ? 'champions' : 'picks';
            this.config[arrayName] = this.config[arrayName] || [];
            this.config[arrayName][this.configIndex] = this.champions[0].id;
            DataStore.set(this.configKey, this.config);
        }

        const alreadyAdded = [];
        for (const champion of this.champions) {
            if (alreadyAdded.includes(champion.name)) {
                continue;
            }
            alreadyAdded.push(champion.name);
            const option = this.getNewOption(champion);
            this.element.appendChild(option);
        }

        // Wait for shadowRoot to become available (element needs to be in DOM)
        let attempts = 0;
        while (!this.element.shadowRoot && attempts < 20) {
            await sleep(50);
            attempts++;
        }

        // Only try to customize placeholder if shadowRoot is available
        if (this.element.shadowRoot) {
            try {
                if (!this.element.shadowRoot.querySelector("#controlado-placeholder")) {
                    const placeholderContainer = this.element.shadowRoot.querySelector(".ui-dropdown-current");
                    if (placeholderContainer) {
                        placeholderContainer.innerHTML = ""; // Clear default content
                        placeholderContainer.style = "display: flex; justify-content: space-between; align-items: center;";
                        const placeholder = this.getNewPlaceholder();
                        placeholderContainer.appendChild(placeholder);
                    }
                }
            } catch (error) {
                console.debug("auto-champion-select(Dropdown.setup): Could not customize placeholder:", error);
            }
        }
    }

    getNewOption(champion) {
        const option = document.createElement("lol-uikit-dropdown-option");
        option.setAttribute("slot", "lol-uikit-dropdown-option");
        option.addEventListener("click", () => {
            const arrayName = this.config.champions ? 'champions' : 'picks';
            this.config[arrayName] = this.config[arrayName] || [];
            this.config[arrayName][this.configIndex] = champion.id;
            DataStore.set(this.configKey, this.config);
            
            try {
                if (this.element.shadowRoot) {
                    const input = this.element.shadowRoot.querySelector("#controlado-search");
                    if (input) {
                        input.value = "";
                        this.filterOptions("");
                    }
                }
            } catch (error) {
                console.debug("auto-champion-select(Dropdown.getNewOption): Error clearing search:", error);
            }
            
            this.updatePlaceholder();
        });

        const championsArray = this.config.champions || this.config.picks || [];
        if (championsArray[this.configIndex] === champion.id) {
            option.setAttribute("selected", "true");
        }

        option.innerText = champion.name;
        return option;
    }

    getNewPlaceholder() {
        const placeholder = document.createElement("div");
        placeholder.classList.add("ui-dropdown-current-content");
        placeholder.id = "controlado-placeholder";
        placeholder.style = "display: flex; align-items: center; gap: 12px; width: 100%;";

        // Get selected champion name and create label
        const championsArray = this.config.champions || this.config.picks || [];
        const selectedId = championsArray[this.configIndex];
        const selectedChampion = this.champions.find(c => c.id === selectedId);
        const championName = selectedChampion ? selectedChampion.name : "Select Champion";
        
        // Determine if it's Pick or Ban and create ordinal label
        const isPick = this.configKey.includes("Pick");
        const action = isPick ? "Pick" : "Ban";
        const ordinal = this.configIndex + 1; // Convert 0-indexed to 1-indexed

        // Create left label container
        const labelContainer = document.createElement("div");
        labelContainer.id = "controlado-label-container";
        labelContainer.style = "display: flex; flex-direction: column; gap: 2px; flex-shrink: 0;";

        const actionLabel = document.createElement("div");
        actionLabel.id = "controlado-action-label";
        actionLabel.style = "color: #c89b3c; font-size: 12px; font-weight: 500;";
        actionLabel.textContent = `${action} ${ordinal}`;

        const championLabel = document.createElement("div");
        championLabel.id = "controlado-champion-label";
        championLabel.style = "color: inherit; font-size: 14px; font-weight: 500;";
        championLabel.textContent = championName;

        labelContainer.appendChild(actionLabel);
        labelContainer.appendChild(championLabel);

        const input = document.createElement("input");
        input.id = "controlado-search";
        input.type = "text";
        input.placeholder = "Search...";
        input.style = "flex: 1; padding: 4px 8px; color: inherit; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; outline: none; font-family: inherit; font-size: inherit; font-weight: inherit; transition: all 0.2s ease;";
        input.addEventListener("input", (e) => this.filterOptions(e.target.value));
        input.addEventListener("focus", (e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.15)";
            e.target.style.borderColor = "rgba(255, 255, 255, 0.4)";
        });
        input.addEventListener("blur", (e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.1)";
            e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
        });

        placeholder.appendChild(labelContainer);
        placeholder.appendChild(input);
        return placeholder;
    }

    updatePlaceholder() {
        try {
            if (!this.element.shadowRoot) {
                return;
            }
            const placeholderElement = this.element.shadowRoot.querySelector("#controlado-placeholder");
            if (placeholderElement) {
                const championsArray = this.config.champions || this.config.picks || [];
                const selectedId = championsArray[this.configIndex];
                const selectedChampion = this.champions.find(c => c.id === selectedId);
                const championName = selectedChampion ? selectedChampion.name : "Select Champion";
                
                const championLabel = placeholderElement.querySelector("#controlado-champion-label");
                if (championLabel) {
                    championLabel.textContent = championName;
                }
            }
        } catch (error) {
            console.debug("auto-champion-select(Dropdown.updatePlaceholder): Error updating placeholder:", error);
        }
    }

    filterOptions(query) {
        const options = this.element.querySelectorAll("lol-uikit-dropdown-option");
        const normalizedQuery = query.toLowerCase().trim();

        if (!normalizedQuery) {
            options.forEach(option => option.style.display = "");
            return options.length;
        }

        options.forEach(option => {
            const optionText = option.innerText.toLowerCase();
            // Show option if query is empty or option text includes the query
            const isMatch = optionText.includes(normalizedQuery);

            if (isMatch) {
                option.style.display = "";
                visibleCount += 1;
            } else {
                option.style.display = "none";
            }

        });

        return visibleCount;
    }

    refresh() {
        this.element.innerHTML = "";
        this.setup();
    }
}

export class RoleDropdown {
    constructor(text, configKey) {
        this.element = document.createElement("lol-uikit-framed-dropdown");
        this.element.classList.add("dropdown-role-default");

        this.text = text;
        this.config = null;
        this.configKey = configKey;
        this.isPrimary = configKey === "controladoPrimaryRole";
        this.otherRoleDropdown = null;
    }

    setOtherRoleDropdown(otherDropdown) {
        this.otherRoleDropdown = otherDropdown;
    }

    getOtherRoleConfigKey() {
        return this.isPrimary ? "controladoSecondaryRole" : "controladoPrimaryRole";
    }

    getOtherRoleConfig() {
        const otherConfigKey = this.getOtherRoleConfigKey();
        return DataStore.get(otherConfigKey) || defaultPluginConfig[otherConfigKey];
    }

    async setup() {
        this.config = DataStore.get(this.configKey) || defaultPluginConfig[this.configKey];

        const roles = ["top", "jungle", "middle", "bottom", "utility"];
        
        for (const role of roles) {
            const option = this.getNewOption(role);
            this.element.appendChild(option);
        }

        // Wait for shadowRoot to become available (element needs to be in DOM)
        let attempts = 0;
        while (!this.element.shadowRoot && attempts < 20) {
            await sleep(50);
            attempts++;
        }

        // Only try to customize placeholder if shadowRoot is available
        if (this.element.shadowRoot) {
            try {
                if (!this.element.shadowRoot.querySelector("#controlado-placeholder")) {
                    const placeholderContainer = this.element.shadowRoot.querySelector(".ui-dropdown-current");
                    if (placeholderContainer) {
                        placeholderContainer.innerHTML = ""; // Clear default content
                        placeholderContainer.style = "display: flex; justify-content: space-between; align-items: center;";
                        const placeholder = this.getNewPlaceholder();
                        placeholderContainer.appendChild(placeholder);
                    }
                }
            } catch (error) {
                console.debug("auto-champion-select(RoleDropdown.setup): Could not customize placeholder:", error);
            }
        }
    }

    getNewOption(role) {
        const option = document.createElement("lol-uikit-dropdown-option");
        option.setAttribute("slot", "lol-uikit-dropdown-option");
        option.addEventListener("click", () => {
            this.setRole(role);
        });

        if (this.config.role === role) {
            option.setAttribute("selected", "true");
        }

        option.innerText = role.charAt(0).toUpperCase() + role.slice(1);
        return option;
    }

    setRole(newRole) {
        const otherConfig = this.getOtherRoleConfig();
        let roleSwapped = false;
        
        // If the new role is the same as the other role's role, swap them
        if (otherConfig.role === newRole) {
            const oldRole = this.config.role;
            
            // Set this config to the new role
            this.config.role = newRole;
            DataStore.set(this.configKey, this.config);
            
            // Set other config to the old role
            otherConfig.role = oldRole;
            DataStore.set(this.getOtherRoleConfigKey(), otherConfig);
            
            roleSwapped = true;
            console.debug(`auto-champion-select: Swapped roles - ${this.configKey} is now ${newRole}, other role is now ${oldRole}`);
        } else {
            // No conflict, just set the role
            this.config.role = newRole;
            DataStore.set(this.configKey, this.config);
        }
        
        this.updatePlaceholder();
        
        // Update the other dropdown's UI if it exists
        if (roleSwapped && this.otherRoleDropdown) {
            this.otherRoleDropdown.config = otherConfig;
            this.otherRoleDropdown.updatePlaceholder();
            this.otherRoleDropdown.refreshOptions();
        }
    }

    getNewPlaceholder() {
        const placeholder = document.createElement("div");
        placeholder.classList.add("ui-dropdown-current-content");
        placeholder.id = "controlado-role-placeholder";
        placeholder.style = "display: flex; align-items: center; gap: 12px; width: 100%;";

        const roleText = this.config.role ? this.config.role.charAt(0).toUpperCase() + this.config.role.slice(1) : "Select Role";
        
        const label = document.createElement("div");
        label.id = "controlado-role-label";
        label.style = "color: inherit; font-size: 14px; font-weight: 500;";
        label.textContent = this.text + ": " + roleText;

        placeholder.appendChild(label);
        return placeholder;
    }

    updatePlaceholder() {
        try {
            if (!this.element.shadowRoot) {
                return;
            }
            const placeholderElement = this.element.shadowRoot.querySelector("#controlado-role-placeholder");
            if (placeholderElement) {
                const roleText = this.config.role ? this.config.role.charAt(0).toUpperCase() + this.config.role.slice(1) : "Select Role";
                const label = placeholderElement.querySelector("#controlado-role-label");
                if (label) {
                    label.textContent = this.text + ": " + roleText;
                }
            }
        } catch (error) {
            console.debug("auto-champion-select(RoleDropdown.updatePlaceholder): Error updating placeholder:", error);
        }
    }

    refreshOptions() {
        const options = this.element.querySelectorAll("lol-uikit-dropdown-option");
        options.forEach(option => {
            const roleText = option.innerText.toLowerCase();
            if (roleText === this.config.role) {
                option.setAttribute("selected", "true");
            } else {
                option.removeAttribute("selected");
            }
        });
    }

    refresh() {
        this.element.innerHTML = "";
        this.setup();
    }
}

export class Checkbox {
    constructor(text, configKey) {
        this.element = document.createElement("lol-uikit-radio-input-option");
        this.element.classList.add("lol-settings-voice-input-mode-option", "auto-select-checkbox");
        this.element.innerText = text;

        this.config = null;
        this.configKey = configKey;
    }

    setup() {
        this.config = DataStore.get(this.configKey) || defaultPluginConfig[this.configKey];

        if (this.config.enabled) {
            this.element.setAttribute("selected", "true");
        }

        this.element.addEventListener("click", () => this.toggle());
    }

    toggle() {
        console.debug("auto-champion-select: Toggling", this.configKey);
        this.config.enabled = !this.config.enabled;
        DataStore.set(this.configKey, this.config);
        this.element.toggleAttribute("selected");
        return this.config.enabled;
    }
}

export class SocialSection {
    constructor(label, ...hiddableElements) {
        this.element = document.createElement("lol-social-roster-group");
        this.element.addEventListener("post-render", () => this.onPostRender());

        this.label = label;
        this.hiddableElements = hiddableElements;
        this.isCollapsed = false;

        this.waitRender();
        
        // Set up observer to detect collapse/expand state changes
        this.setupCollapseObserver();
    }

    waitRender() {
        new MutationObserver((_, observer) => {
            if (this.element.querySelector("span")) {
                const newEvent = new Event("post-render");
                this.element.dispatchEvent(newEvent);
                observer.disconnect();
            }
        }
        ).observe(this.element, { childList: true });
    }

    onPostRender() {
        try {
            const spanElement = this.element.querySelector("span");
            if (spanElement) {
                spanElement.innerText = this.label;
            }
            const headerElement = this.element.querySelector(".group-header");
            if (headerElement) {
                headerElement.removeAttribute("graggable");
            }
        } catch (error) {
            console.error("auto-champion-select(SocialSection.onPostRender): Error in post-render:", error);
        }
    }

    setupCollapseObserver() {
        try {
            // Monitor the arrow element for the 'open' attribute to detect collapse/expand
            new MutationObserver(() => {
                try {
                    const arrowElement = this.element.querySelector(".arrow");
                    if (arrowElement) {
                        const isOpen = arrowElement.hasAttribute("open");
                        if (isOpen !== !this.isCollapsed) {
                            this.isCollapsed = !isOpen;
                            this.onCollapsedStateChanged();
                        }
                    }
                } catch (e) {
                    // Silently fail - element may not be ready yet
                }
            }).observe(this.element, { 
                attributes: true, 
                subtree: true, 
                attributeFilter: ["open"]
            });
        } catch (error) {
            console.error("auto-champion-select(SocialSection.setupCollapseObserver): Error setting up observer:", error);
        }
    }

    onCollapsedStateChanged() {
        try {
            this.hiddableElements.forEach(element => {
                if (element && element.classList) {
                    if (this.isCollapsed) {
                        element.classList.add("hidden");
                    } else {
                        element.classList.remove("hidden");
                    }
                }
            });
        } catch (error) {
            console.error("auto-champion-select(SocialSection.onCollapsedStateChanged): Error updating visibility:", error);
        }
    }
}