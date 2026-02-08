import defaultPluginConfig from "../config.json";
import { sleep } from "https://cdn.jsdelivr.net/npm/balaclava-utils@latest";

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
        const championsArray = this.config.champions || this.config.picks || [];
        if (!this.champions.some(champion => championsArray[this.configIndex] === champion.id)) {
            const arrayName = this.config.champions ? 'champions' : 'picks';
            this.config[arrayName] = this.config[arrayName] || [];
            this.config[arrayName][this.configIndex] = this.champions[0].id;
            DataStore.set(this.configKey, this.config);
        }
        const alreadyAdded = [];
        for (const champion of this.champions) {
            if (alreadyAdded.includes(champion.name)) continue;
            alreadyAdded.push(champion.name);
            const option = this.getNewOption(champion);
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
                console.debug("auto-champion-select(Dropdown.customizePlaceholder): Could not customize placeholder:", error);
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
        const championsArray = this.config.champions || this.config.picks || [];
        const selectedId = championsArray[this.configIndex];
        const selectedChampion = this.champions.find(c => c.id === selectedId);
        const championName = selectedChampion ? selectedChampion.name : "Select Champion";
        const labelContainer = document.createElement("div");
        labelContainer.id = "controlado-label-container";
        labelContainer.style = "display: flex; flex-direction: column; gap: 2px; flex-shrink: 0;";
        const championLabel = document.createElement("div");
        championLabel.id = "controlado-champion-label";
        championLabel.style = "color: inherit; font-size: 14px; font-weight: 500;";
        championLabel.textContent = championName;
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
            if (!this.element.shadowRoot) return;
            const placeholderElement = this.element.shadowRoot.querySelector("#controlado-placeholder");
            if (placeholderElement) {
                const championsArray = this.config.champions || this.config.picks || [];
                const selectedId = championsArray[this.configIndex];
                const selectedChampion = this.champions.find(c => c.id === selectedId);
                const championName = selectedChampion ? selectedChampion.name : "Select Champion";
                const championLabel = placeholderElement.querySelector("#controlado-champion-label");
                if (championLabel) championLabel.textContent = championName;
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
            const isMatch = optionText.includes(normalizedQuery);
            if (isMatch) {
                option.style.display = "";
            } else {
                option.style.display = "none";
            }
        });
        return options.length;
    }
    async refresh() {
        this.element.innerHTML = "";
        await this.setup();
        await this.customizePlaceholder();
    }
}
