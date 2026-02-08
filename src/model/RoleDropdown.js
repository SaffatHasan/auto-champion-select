import defaultPluginConfig from "../config.json";
import { sleep } from "https://cdn.jsdelivr.net/npm/balaclava-utils@latest";

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
    }
    async customizePlaceholder() {
        let attempts = 0;
        while (!this.element.shadowRoot && attempts < 20) {
            await sleep(50);
            attempts++;
        }
        if (this.element.shadowRoot) {
            try {
                if (!this.element.shadowRoot.querySelector("#controlado-placeholder")) {
                    const placeholderContainer = this.element.shadowRoot.querySelector(".ui-dropdown-current");
                    if (placeholderContainer) {
                        placeholderContainer.innerHTML = "";
                        placeholderContainer.style = "display: flex; justify-content: space-between; align-items: center;";
                        const placeholder = this.getNewPlaceholder();
                        placeholderContainer.appendChild(placeholder);
                    }
                }
            } catch (error) {
                console.debug("auto-champion-select(RoleDropdown.customizePlaceholder): Could not customize placeholder:", error);
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
        if (otherConfig.role === newRole) {
            const oldRole = this.config.role;
            this.config.role = newRole;
            DataStore.set(this.configKey, this.config);
            otherConfig.role = oldRole;
            DataStore.set(this.getOtherRoleConfigKey(), otherConfig);
            roleSwapped = true;
            console.debug(`auto-champion-select: Swapped roles - ${this.configKey} is now ${newRole}, other role is now ${oldRole}`);
        } else {
            this.config.role = newRole;
            DataStore.set(this.configKey, this.config);
        }
        this.updatePlaceholder();
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
            if (!this.element.shadowRoot) return;
            const placeholderElement = this.element.shadowRoot.querySelector("#controlado-role-placeholder");
            if (placeholderElement) {
                const roleText = this.config.role ? this.config.role.charAt(0).toUpperCase() + this.config.role.slice(1) : "Select Role";
                const label = placeholderElement.querySelector("#controlado-role-label");
                if (label) label.textContent = this.text + ": " + roleText;
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
    async refresh() {
        this.element.innerHTML = "";
        await this.setup();
        await this.customizePlaceholder();
    }
}
