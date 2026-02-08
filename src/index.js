import { request, sleep, linkEndpoint } from "https://cdn.jsdelivr.net/npm/balaclava-utils@latest";
import { ChampionSelectPick, ChampionSelectBan, Dropdown, RoleDropdown, Checkbox, SocialSection, AssignedRole } from "./model/index.js";
import { AutoPickSwitchAction, AutoBanSwitchAction, ForcePickSwitchAction, ForceBanSwitchAction, RefreshDropdownsAction, addActions } from "./actions.js";

import { version } from "../package.json";
import "./assets/style.css";

/**
 * @author balaclava
 * @name auto-champion-select
 * @link https://github.com/controlado/auto-champion-select
 * @description Pick or ban automatically! 🐧
 */

const championSelectPick = new ChampionSelectPick();
const championSelectBan = new ChampionSelectBan();

const autoAcceptCheckbox = new Checkbox("Accept", "controladoAutoAccept");
const autoPickCheckbox = new Checkbox("Pick", "controladoPick");
const banCheckbox = new Checkbox("Ban", "controladoBan");

// Simplified role-based pick system - only show champion picks for the selected role
const primaryRoleDropdown = new RoleDropdown("Primary Role", "controladoPrimaryRole");
const primaryRoleChampionDropdown = new Dropdown("Champion", "controladoPrimaryRole", 0, getPlayableChampions);

const secondaryRoleDropdown = new RoleDropdown("Secondary Role", "controladoSecondaryRole");
const secondaryRoleChampionDropdown = new Dropdown("Champion", "controladoSecondaryRole", 0, getPlayableChampions);

// Link role dropdowns for swap notifications
primaryRoleDropdown.setOtherRoleDropdown(secondaryRoleDropdown);
secondaryRoleDropdown.setOtherRoleDropdown(primaryRoleDropdown);

const banDropdown = new Dropdown("Ban 1", "controladoBan", 0, getAllChampions);

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
        primaryRoleChampionDropdown.setup(),
        secondaryRoleDropdown.setup(),
        secondaryRoleChampionDropdown.setup(),
        banDropdown.setup(),
    ]);

    addActions([
        new AutoPickSwitchAction(() => autoPickCheckbox.toggle()),
        new AutoBanSwitchAction(() => banCheckbox.toggle()),
        new ForcePickSwitchAction(),
        new ForceBanSwitchAction(),
        new RefreshDropdownsAction([
            primaryRoleChampionDropdown,
            secondaryRoleChampionDropdown,
        ]),
    ]);

    linkEndpoint("/lol-inventory/v1/wallet", parsedEvent => {
        if (parsedEvent.eventType === "Update") {
            console.debug("auto-champion-select(wallet): Refreshing dropdowns...");
            Promise.all([
                primaryRoleChampionDropdown.refresh(),
                secondaryRoleChampionDropdown.refresh(),
            ]);
        }
    });

    linkEndpoint("/lol-gameflow/v1/gameflow-phase", parsedEvent => {
        if (parsedEvent.data === "ReadyCheck") { onReadyCheck(); }
        if (parsedEvent.data === "ChampSelect") {
            championSelectPick.mount();
            championSelectBan.mount();
        } else {
            championSelectPick.unmount();
            championSelectBan.unmount();
        }
    });

    // Replace the original block with a call to buildChampionSelectUI()
    buildChampionSelectUI();
    
    // Customize dropdowns after they're in the DOM
    await Promise.all([
        primaryRoleDropdown.customizePlaceholder(),
        primaryRoleChampionDropdown.customizePlaceholder(),
        secondaryRoleDropdown.customizePlaceholder(),
        secondaryRoleChampionDropdown.customizePlaceholder(),
        banDropdown.customizePlaceholder(),
    ]);
    
    console.debug(`auto-champion-select(${version}): Report bugs to Balaclava#1912`);
});

function buildChampionSelectUI() {
    const socialContainer = getSocialContainer();
    if (!socialContainer) {
        console.error("auto-champion-select: socialContainer not found. UI will not be rendered.");
        return;
    }

    // Settings as a single row (no card, no title, no background coloring)
    function createSettingsRow(checkboxes) {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; flex-direction: row; align-items: center; gap: 18px; margin-bottom: 12px; width: 100%;";
        checkboxes.forEach(cb => {
            row.append(cb.element);
        });
        return row;
    }

    // Other cards
    const primaryRoleCard = createCard({
        title: "PRIMARY",
        headerContent: primaryRoleDropdown.element,
        children: [primaryRoleChampionDropdown.element]
    });
    const secondaryRoleCard = createCard({
        title: "SECONDARY",
        headerContent: secondaryRoleDropdown.element,
        children: [secondaryRoleChampionDropdown.element]
    });
    const banCard = createCard({
        title: "BANS",
        children: [banDropdown.element]
    });

    // Helper to set transparency and enable/disable dropdowns based on custom Checkbox state
    function setSectionTransparencyAndDisable(section, checkbox, dropdowns) {
        function update() {
            const enabled = checkbox.element.hasAttribute('selected');
            section.style.opacity = enabled ? "1" : "0.4";
            dropdowns.forEach(dropdown => {
                dropdown.element.setAttribute('disabled', enabled ? null : 'true');
                // For native <select> or input, you could use .disabled = !enabled
            });
        }
        update();
        const observer = new MutationObserver(update);
        observer.observe(checkbox.element, { attributes: true, attributeFilter: ['selected'] });
        checkbox.element.addEventListener("click", update);
    }

    // Set transparency and disable/enable for each section
    setSectionTransparencyAndDisable(
        primaryRoleCard,
        autoPickCheckbox,
        [primaryRoleDropdown, primaryRoleChampionDropdown]
    );
    setSectionTransparencyAndDisable(
        secondaryRoleCard,
        autoPickCheckbox,
        [secondaryRoleDropdown, secondaryRoleChampionDropdown]
    );
    setSectionTransparencyAndDisable(
        banCard,
        banCheckbox,
        [banDropdown]
    );

    // Assemble UI
    const uiContainer = document.createElement("div");
    uiContainer.style.cssText = "display: flex; flex-direction: column; gap: 8px; padding: 0;";
    // Add settings row at the top
    uiContainer.append(
        primaryRoleCard, secondaryRoleCard, banCard,
        createSettingsRow([autoAcceptCheckbox, autoPickCheckbox, banCheckbox]),
    );

    // Wrapper and header
    const pluginWrapper = document.createElement("div");
    pluginWrapper.style.cssText = "margin: 8px 4px; border: 1px solid #785a28; border-radius: 2px; background: rgba(0,0,0,0.2);";
    const pluginHeader = document.createElement("div");
    pluginHeader.style.cssText = "background: rgba(200,155,60,0.2); padding: 8px 10px; border-top: 1px solid #785a28; color: #c89b3c; font-weight: bold; font-size: 12px; cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center;";
    pluginHeader.innerHTML = "Auto Champion Select <span style='font-size: 10px; opacity: 0.7;'>▲</span>";
    let isExpanded = false;
    pluginHeader.addEventListener("click", () => {
        isExpanded = !isExpanded;
        contentWrapper.style.display = isExpanded ? "block" : "none";
        pluginHeader.style.opacity = isExpanded ? "1" : "0.8";
        pluginHeader.querySelector("span").textContent = isExpanded ? "▲" : "▼";
    });
    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = "display: none; padding: 0;";
    contentWrapper.appendChild(uiContainer);
    pluginWrapper.appendChild(contentWrapper);
    pluginWrapper.appendChild(pluginHeader);
    socialContainer.append(pluginWrapper);

    console.debug(`auto-champion-select(${version}): Report bugs to Balaclava#1912`);
}

function createCard({ title, children, contentStyle, headerContent }) {
    const card = document.createElement("div");
    card.style.cssText = "background: rgba(200,155,60,0.18); border-radius: 4px; margin-bottom: 8px; box-shadow: 0 1px 4px 0 rgba(120,90,40,0.10);";
    const header = document.createElement("div");
    header.style.cssText = "font-weight: bold; margin-bottom: 6px; color: #c89b3c; display: flex; align-items: center; gap: 10px; padding: 6px 10px 0 10px;";
    header.textContent = title;
    if (headerContent) header.append(headerContent);
    card.append(header);
    const content = document.createElement("div");
    content.style.cssText = (contentStyle || "display: flex; flex-direction: column; gap: 6px;") + "; padding: 0 10px 10px 10px;";
    children.forEach(child => content.append(child));
    card.append(content);
    return card;
}