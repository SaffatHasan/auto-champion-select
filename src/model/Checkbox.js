import defaultPluginConfig from "../config.json";

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
