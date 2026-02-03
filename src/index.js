import { request, sleep, linkEndpoint } from "https://cdn.jsdelivr.net/npm/balaclava-utils@latest";
import { ChampionSelect, Dropdown, RoleDropdown, Checkbox, SocialSection, AssignedRole } from "./models.js";
import { AutoPickSwitchAction, AutoBanSwitchAction, ForcePickSwitchAction, ForceBanSwitchAction, RefreshDropdownsAction, addActions } from "./actions.js";

import { version } from "../package.json";
import "./assets/style.css";

/**
 * @author balaclava
 * @name auto-champion-select
 * @link https://github.com/controlado/auto-champion-select
 * @description Pick or ban automatically! 🐧
 */

const championSelect = new ChampionSelect();

const autoAcceptCheckbox = new Checkbox("Accept", "controladoAutoAccept");

// Simplified role-based pick system - only show champion picks for the selected role
const primaryRoleDropdown = new RoleDropdown("Primary Role", "controladoPrimaryRole");
const primaryRoleChampion1Dropdown = new Dropdown("Champion 1", "controladoPrimaryRole", 0, getPlayableChampions);
const primaryRoleChampion2Dropdown = new Dropdown("Champion 2", "controladoPrimaryRole", 1, getPlayableChampions);

const secondaryRoleDropdown = new RoleDropdown("Secondary Role", "controladoSecondaryRole");
const secondaryRoleChampion1Dropdown = new Dropdown("Champion 1", "controladoSecondaryRole", 0, getPlayableChampions);
const secondaryRoleChampion2Dropdown = new Dropdown("Champion 2", "controladoSecondaryRole", 1, getPlayableChampions);

// Link role dropdowns for swap notifications
primaryRoleDropdown.setOtherRoleDropdown(secondaryRoleDropdown);
secondaryRoleDropdown.setOtherRoleDropdown(primaryRoleDropdown);

const autoPickCheckbox = new Checkbox("Enable Picks", "controladoPick");
const banCheckbox = new Checkbox("Enable Bans", "controladoBan");
const firstBanDropdown = new Dropdown("Ban 1", "controladoBan", 0, getAllChampions);
const secondBanDropdown = new Dropdown("Ban 2", "controladoBan", 1, getAllChampions);

function getSocialContainer() {
    return document.querySelector(".lol-social-roster");
}

async function getPlayableChampions() {
    let response = await request("GET", "/lol-champions/v1/owned-champions-minimal");

    while (!response.ok) {
        console.debug("auto-champion-select(owned-champions-minimal): Retrying...");
        response = await request("GET", "/lol-champions/v1/owned-champions-minimal");
        await sleep(1000); // endpoint /lol-champions/v1/owned-champions-minimal returns 404 at startup
    }

    const responseData = await response.json();
    responseData.sort((a, b) => a.name.localeCompare(b.name));
    return responseData;
}

async function getAllChampions() {
    const response = await request("GET", "/lol-game-data/assets/v1/champion-summary.json");
    const responseData = await response.json();
    responseData.sort((a, b) => a.name.localeCompare(b.name));
    return responseData;
}

async function onReadyCheck() {
    if (autoAcceptCheckbox.config.enabled === true) {
        console.debug("auto-champion-select(auto-accept): Ready check detected, accepting in 2 seconds...");
        await sleep(2000);
        await autoAccept();
    }
}

async function autoAccept() {
    const response = await request("POST", "/lol-matchmaking/v1/ready-check/accept");
    if (response.ok) {
        console.debug("auto-champion-select(auto-accept): Accepted ready check");
    } else {
        console.error("auto-champion-select(auto-accept): Failed to accept ready check", response);
    }
}

window.addEventListener("load", async () => {
    let socialContainer = getSocialContainer();

    while (!socialContainer) {
        await sleep(200); // not available at startup
        socialContainer = getSocialContainer();
    }

    // Setup all UI elements before building the UI
    await Promise.all([
        autoAcceptCheckbox.setup(),
        autoPickCheckbox.setup(),
        banCheckbox.setup(),
        primaryRoleDropdown.setup(),
        primaryRoleChampion1Dropdown.setup(),
        primaryRoleChampion2Dropdown.setup(),
        secondaryRoleDropdown.setup(),
        secondaryRoleChampion1Dropdown.setup(),
        secondaryRoleChampion2Dropdown.setup(),
        firstBanDropdown.setup(),
        secondBanDropdown.setup()
    ]);

    addActions([
        new AutoBanSwitchAction(() => banCheckbox.toggle()),
        new ForcePickSwitchAction(),
        new ForceBanSwitchAction(),
        new RefreshDropdownsAction([
            primaryRoleChampion1Dropdown,
            primaryRoleChampion2Dropdown,
            secondaryRoleChampion1Dropdown,
            secondaryRoleChampion2Dropdown,
        ]),
    ]);

    linkEndpoint("/lol-inventory/v1/wallet", parsedEvent => {
        if (parsedEvent.eventType === "Update") {
            console.debug("auto-champion-select(wallet): Refreshing dropdowns...");
            Promise.all([
                primaryRoleChampion1Dropdown.refresh(),
                primaryRoleChampion2Dropdown.refresh(),
                secondaryRoleChampion1Dropdown.refresh(),
                secondaryRoleChampion2Dropdown.refresh(),
            ]);
        }
    });

    linkEndpoint("/lol-gameflow/v1/gameflow-phase", parsedEvent => {
        if (parsedEvent.data === "ReadyCheck") { onReadyCheck(); }
        if (parsedEvent.data === "ChampSelect") { championSelect.mount(); }
        else { championSelect.unmount(); }
    });

    // Build card-based UI layout
    const uiContainer = document.createElement("div");
    uiContainer.style.cssText = "display: flex; flex-direction: column; gap: 12px; padding: 8px;";

    // Primary Role Card
    const primaryRoleCard = document.createElement("div");
    primaryRoleCard.style.cssText = "border: 1px solid #785a28; border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.3);";
    primaryRoleCard.innerHTML = "<div style='font-weight: bold; margin-bottom: 6px; color: #c89b3c;'>PRIMARY ROLE</div>";
    const primaryRoleContent = document.createElement("div");
    primaryRoleContent.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
    primaryRoleContent.append(
        primaryRoleDropdown.element,
        primaryRoleChampion1Dropdown.element,
        primaryRoleChampion2Dropdown.element
    );
    primaryRoleCard.append(primaryRoleContent);

    // Picks Card
    const picksCard = document.createElement("div");
    picksCard.style.cssText = "border: 1px solid #785a28; border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.3);";
    picksCard.innerHTML = "<div style='font-weight: bold; margin-bottom: 6px; color: #c89b3c;'>PICKS</div>";
    const picksContent = document.createElement("div");
    picksContent.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
    picksContent.append(autoPickCheckbox.element);
    picksCard.append(picksContent);

    // Secondary Role Card
    const secondaryRoleCard = document.createElement("div");
    secondaryRoleCard.style.cssText = "border: 1px solid #785a28; border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.3);";
    secondaryRoleCard.innerHTML = "<div style='font-weight: bold; margin-bottom: 6px; color: #c89b3c;'>SECONDARY ROLE</div>";
    const secondaryRoleContent = document.createElement("div");
    secondaryRoleContent.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
    secondaryRoleContent.append(
        secondaryRoleDropdown.element,
        secondaryRoleChampion1Dropdown.element,
        secondaryRoleChampion2Dropdown.element
    );
    secondaryRoleCard.append(secondaryRoleContent);

    // Ban Card
    const banCard = document.createElement("div");
    banCard.style.cssText = "border: 1px solid #785a28; border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.3);";
    banCard.innerHTML = "<div style='font-weight: bold; margin-bottom: 6px; color: #c89b3c;'>BANS</div>";
    const banContent = document.createElement("div");
    banContent.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
    banContent.append(
        banCheckbox.element,
        firstBanDropdown.element,
        secondBanDropdown.element
    );
    banCard.append(banContent);

    // Settings Card
    const settingsCard = document.createElement("div");
    settingsCard.style.cssText = "border: 1px solid #785a28; border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.3);";
    settingsCard.innerHTML = "<div style='font-weight: bold; margin-bottom: 6px; color: #c89b3c;'>SETTINGS</div>";
    const settingsContent = document.createElement("div");
    settingsContent.append(autoAcceptCheckbox.element);
    settingsCard.append(settingsContent);

    // Assemble UI
    uiContainer.append(primaryRoleCard, picksCard, secondaryRoleCard, banCard, settingsCard);

    // Add a wrapper container with styling
    const pluginWrapper = document.createElement("div");
    pluginWrapper.style.cssText = "margin: 8px 4px; border: 1px solid #785a28; border-radius: 2px; background: rgba(0,0,0,0.2);";
    
    // Add header
    const pluginHeader = document.createElement("div");
    pluginHeader.style.cssText = "background: rgba(200,155,60,0.2); padding: 8px 10px; border-bottom: 1px solid #785a28; color: #c89b3c; font-weight: bold; font-size: 12px; cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center;";
    pluginHeader.innerHTML = "Auto Champion Select <span style='font-size: 10px; opacity: 0.7;'>▼</span>";
    
    let isExpanded = false;
    pluginHeader.addEventListener("click", () => {
        isExpanded = !isExpanded;
        contentWrapper.style.display = isExpanded ? "block" : "none";
        pluginHeader.style.opacity = isExpanded ? "1" : "0.8";
    });
    
    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = "display: none; max-height: 280px; overflow-y: auto; padding: 0;";
    contentWrapper.appendChild(uiContainer);
    
    pluginWrapper.appendChild(pluginHeader);
    pluginWrapper.appendChild(contentWrapper);
    socialContainer.append(pluginWrapper);

    console.debug(`auto-champion-select(${version}): Report bugs to Balaclava#1912`);
});