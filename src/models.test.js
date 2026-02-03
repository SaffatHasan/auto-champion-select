import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock external dependency before defining globals
// This must happen before any module imports
vi.mock("https://cdn.jsdelivr.net/npm/balaclava-utils@latest", () => ({
    request: vi.fn(),
    sleep: vi.fn(() => Promise.resolve()),
}), { virtual: true });

// Mock config.json
vi.mock("./config.json", () => ({
    default: {
        controladoPick: { enabled: false, force: false, champions: [1, 2] },
        controladoBan: { enabled: false, force: false, champions: [3, 4] },
        controladoPrimaryRole: { role: "top", picks: [1, 2] },
        controladoSecondaryRole: { role: "jungle", picks: [3, 4] },
        controladoAutoAccept: { enabled: false }
    }
}));

// Mock globals
global.DataStore = { get: vi.fn(), set: vi.fn() };

// Mock MutationObserver
global.MutationObserver = class {
    constructor(callback) {
        this.callback = callback;
    }
    observe() {}
    disconnect() {}
};

// Helper to create proper classList mock
function createClassListMock() {
    const classes = new Set();
    return {
        add: (className) => classes.add(className),
        remove: (className) => classes.delete(className),
        toggle: (className) => {
            if (classes.has(className)) {
                classes.delete(className);
            } else {
                classes.add(className);
            }
        },
        contains: (className) => classes.has(className),
        toString: () => Array.from(classes).join(" ")
    };
}

// Minimal DOM mock for Node test environment
global.document = {
    createElement: (tag) => {
        return {
            tagName: tag,
            classList: createClassListMock(),
            setAttribute: () => {},
            appendChild: () => {},
            querySelector: () => null,
            addEventListener: () => {},
            removeEventListener: () => {},
            innerText: "",
            value: ""
        };
    }
};

// Import after all mocks are set up
import { AssignedRole, ChampionSelect, Dropdown, RoleDropdown, Checkbox, SocialSection } from "./models.js";

describe("AssignedRole Enum", () => {
    it("has static role values", () => {
        expect(AssignedRole.TOP).toBeDefined();
        expect(AssignedRole.JUNGLE).toBeDefined();
        expect(AssignedRole.MIDDLE).toBeDefined();
        expect(AssignedRole.BOTTOM).toBeDefined();
        expect(AssignedRole.UTILITY).toBeDefined();
        expect(AssignedRole.UNASSIGNED).toBeDefined();
    });

    it("maps strings to enum via from_session", () => {
        expect(AssignedRole.from_session("top")).toBe(AssignedRole.TOP);
        expect(AssignedRole.from_session("jungle")).toBe(AssignedRole.JUNGLE);
        expect(AssignedRole.from_session("middle")).toBe(AssignedRole.MIDDLE);
        expect(AssignedRole.from_session("bottom")).toBe(AssignedRole.BOTTOM);
        expect(AssignedRole.from_session("utility")).toBe(AssignedRole.UTILITY);
        expect(AssignedRole.from_session(null)).toBe(AssignedRole.UNASSIGNED);
        expect(AssignedRole.from_session("invalid")).toBe(AssignedRole.UNASSIGNED);
    });
});

describe("ChampionSelect basics", () => {
    let cs;
    beforeEach(() => {
        vi.clearAllMocks();
        cs = new ChampionSelect();
        cs.stopWatch();  // Stop the watch loop to prevent memory issues
    });

    afterEach(() => {
        cs.stopWatch();
    });

    it("initializes currentRole as UNASSIGNED", () => {
        expect(cs.currentRole).toBe(AssignedRole.UNASSIGNED);
    });

    it("getAssignedRole returns role or UNASSIGNED", () => {
        const myTeam = [ { cellId: 1, assignedPosition: "top" }, { cellId: 2, assignedPosition: "jungle" } ];
        expect(cs.getAssignedRole(myTeam, 1)).toBe(AssignedRole.TOP);
        expect(cs.getAssignedRole(myTeam, 999)).toBe(AssignedRole.UNASSIGNED);
    });
});

describe("Champion validation helpers", () => {
    let cs;
    beforeEach(() => {
        cs = new ChampionSelect();
        cs.stopWatch();  // Stop the watch loop
        cs.allBans = [1,2,3];
        cs.teamIntents = [4,5];
        cs.allPicks = [{ championId: 6 }, { championId: 7 }];
    });

    afterEach(() => {
        cs.stopWatch();
    });

    it("detects banned/picked/intents correctly", () => {
        expect(cs.isChampionAlreadyBanned(1)).toBe(true);
        expect(cs.isChampionAlreadyBanned(999)).toBe(false);
        expect(cs.isChampionInTeamIntents(4)).toBe(true);
        expect(cs.isChampionInTeamIntents(999)).toBe(false);
        expect(cs.isChampionAlreadyPicked(6)).toBe(true);
        expect(cs.isChampionAlreadyPicked(999)).toBe(false);
    });
});

describe("Model utility & filter tests", () => {
    it("DataStore mock is present", () => {
        expect(global.DataStore).toBeDefined();
        expect(global.DataStore.get).toBeDefined();
        expect(global.DataStore.set).toBeDefined();
    });

    it("filters champions case-insensitively and by partials", () => {
        const champions = [ { id:1, name: 'Aatrox' }, { id:2, name: 'Ahri' }, { id:3, name: 'Akali' } ];
        const filtered = champions.filter(c => c.name.toLowerCase().includes('ahri'.toLowerCase()));
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Ahri');
    });
});

describe("Module Exports", () => {
    it("exports all required classes from models.js", () => {
        expect(AssignedRole).toBeDefined();
        expect(typeof AssignedRole).toBe("function");
    });

    it("exports ChampionSelect class", () => {
        expect(ChampionSelect).toBeDefined();
        expect(typeof ChampionSelect).toBe("function");
    });

    it("exports Dropdown class", () => {
        expect(Dropdown).toBeDefined();
        expect(typeof Dropdown).toBe("function");
    });

    it("exports RoleDropdown class", () => {
        expect(RoleDropdown).toBeDefined();
        expect(typeof RoleDropdown).toBe("function");
    });

    it("exports Checkbox class", () => {
        expect(Checkbox).toBeDefined();
        expect(typeof Checkbox).toBe("function");
    });

    it("exports SocialSection class", () => {
        expect(SocialSection).toBeDefined();
        expect(typeof SocialSection).toBe("function");
    });

    it("can instantiate RoleDropdown", () => {
        const roleDropdown = new RoleDropdown("Test Role", "test-config-key");
        expect(roleDropdown).toBeDefined();
        expect(roleDropdown.text).toBe("Test Role");
        expect(roleDropdown.configKey).toBe("test-config-key");
    });
});

describe("DOM Integration and UI Structure", () => {
    it("Dropdown creates element with correct tag name", () => {
        const dropdown = new Dropdown("Test", "test-config", 0, async () => []);
        expect(dropdown.element).toBeDefined();
        expect(dropdown.element.tagName.toLowerCase()).toBe("lol-uikit-framed-dropdown");
    });

    it("Checkbox creates element with correct tag name", () => {
        const checkbox = new Checkbox("Test", "test-config");
        expect(checkbox.element).toBeDefined();
        expect(checkbox.element.tagName.toLowerCase()).toBe("lol-uikit-radio-input-option");
    });

    it("RoleDropdown creates element with correct tag name", () => {
        const roleDropdown = new RoleDropdown("Top", "primary-role");
        expect(roleDropdown.element).toBeDefined();
        expect(roleDropdown.element.tagName.toLowerCase()).toBe("lol-uikit-framed-dropdown");
    });

    it("Dropdown stores text property", () => {
        const text = "Champion Pick";
        const dropdown = new Dropdown(text, "config-key", 0, async () => []);
        expect(dropdown.text).toBe(text);
    });

    it("Dropdown stores configKey property", () => {
        const configKey = "primary-pick";
        const dropdown = new Dropdown("Test", configKey, 1, async () => []);
        expect(dropdown.configKey).toBe(configKey);
    });

    it("Checkbox stores text in element", () => {
        const text = "Enable Feature";
        const checkbox = new Checkbox(text, "config-key");
        expect(checkbox.element.innerText).toBe(text);
    });

    it("Checkbox stores configKey property", () => {
        const configKey = "feature-enabled";
        const checkbox = new Checkbox("Test", configKey);
        expect(checkbox.configKey).toBe(configKey);
    });

    it("RoleDropdown getOtherRoleConfigKey returns opposite role key", () => {
        const primary = new RoleDropdown("Primary", "controladoPrimaryRole");
        const secondary = new RoleDropdown("Secondary", "controladoSecondaryRole");
        
        expect(primary.getOtherRoleConfigKey()).toBe("controladoSecondaryRole");
        expect(secondary.getOtherRoleConfigKey()).toBe("controladoPrimaryRole");
    });

    it("RoleDropdown identifies primary role correctly", () => {
        const primary = new RoleDropdown("Primary", "controladoPrimaryRole");
        const secondary = new RoleDropdown("Secondary", "controladoSecondaryRole");
        
        expect(primary.isPrimary).toBe(true);
        expect(secondary.isPrimary).toBe(false);
    });

    it("RoleDropdown setOtherRoleDropdown stores reference", () => {
        const primary = new RoleDropdown("Primary", "controladoPrimaryRole");
        const secondary = new RoleDropdown("Secondary", "controladoSecondaryRole");
        
        primary.setOtherRoleDropdown(secondary);
        
        expect(primary.otherRoleDropdown).toBe(secondary);
    });

    it("Checkbox toggle method exists", () => {
        const checkbox = new Checkbox("Test", "config-key");
        expect(typeof checkbox.toggle).toBe("function");
    });

    it("Dropdown and Checkbox elements are different instances", () => {
        const dropdown = new Dropdown("Drop", "drop-key", 0, async () => []);
        const checkbox = new Checkbox("Check", "check-key");
        
        expect(dropdown.element).not.toBe(checkbox.element);
    });

    it("Multiple Dropdown instances create separate elements", () => {
        const drop1 = new Dropdown("Drop1", "key1", 0, async () => []);
        const drop2 = new Dropdown("Drop2", "key2", 1, async () => []);
        const drop3 = new Dropdown("Drop3", "key3", 2, async () => []);
        
        expect(drop1.element).not.toBe(drop2.element);
        expect(drop2.element).not.toBe(drop3.element);
        expect(drop1.element).not.toBe(drop3.element);
    });

    it("Checkbox element has aria-checked attribute capability", () => {
        const checkbox = new Checkbox("Test", "config-key");
        expect(typeof checkbox.element.setAttribute).toBe("function");
        
        // Verify we can set attributes without errors
        expect(() => {
            checkbox.element.setAttribute("test-attr", "test-value");
        }).not.toThrow();
    });

    it("UI elements can be stored in collections without issues", () => {
        const uiElements = [];
        
        uiElements.push(new Dropdown("D1", "k1", 0, async () => []));
        uiElements.push(new Dropdown("D2", "k2", 1, async () => []));
        uiElements.push(new Checkbox("C1", "ck1"));
        uiElements.push(new RoleDropdown("R1", "rk1"));
        
        expect(uiElements.length).toBe(4);
        expect(uiElements.every(el => el.element)).toBe(true);
        expect(uiElements.every(el => el.element.tagName)).toBe(true);
    });

    it("RoleDropdown can be linked bidirectionally", () => {
        const primary = new RoleDropdown("Primary", "controladoPrimaryRole");
        const secondary = new RoleDropdown("Secondary", "controladoSecondaryRole");
        
        primary.setOtherRoleDropdown(secondary);
        secondary.setOtherRoleDropdown(primary);
        
        expect(primary.otherRoleDropdown).toBe(secondary);
        expect(secondary.otherRoleDropdown).toBe(primary);
    });
});

describe("SocialSection Error Prevention", () => {
    it("SocialSection.onPostRender handles missing DOM elements gracefully", () => {
        const container = document.createElement("div");
        const socialSection = new SocialSection("Test", container);
        
        // Should not throw even if span or .group-header is missing
        expect(() => {
            socialSection.onPostRender();
        }).not.toThrow();
    });

    it("SocialSection handles undefined hiddableElements", () => {
        // Even with no elements passed, constructor shouldn't fail
        const socialSection = new SocialSection("Test");
        
        expect(() => {
            socialSection.onCollapsedStateChanged();
        }).not.toThrow();
    });

    it("SocialSection stores all hiddable elements passed as arguments", () => {
        const elem1 = document.createElement("div");
        const elem2 = document.createElement("div");
        const elem3 = document.createElement("div");
        
        const socialSection = new SocialSection("Test", elem1, elem2, elem3);
        
        expect(socialSection.hiddableElements).toEqual([elem1, elem2, elem3]);
    });

    it("SocialSection handles single container hiddable element", () => {
        const container = document.createElement("div");
        const socialSection = new SocialSection("Test", container);
        
        expect(socialSection.hiddableElements).toHaveLength(1);
        expect(socialSection.hiddableElements[0]).toBe(container);
    });

    it("SocialSection onCollapsedStateChanged toggles hidden class", () => {
        const container1 = document.createElement("div");
        const container2 = document.createElement("div");
        
        const socialSection = new SocialSection("Test", container1, container2);
        
        // Initial state - not collapsed, so no hidden class
        expect(container1.classList.contains("hidden")).toBe(false);
        expect(container2.classList.contains("hidden")).toBe(false);
        
        // Set collapsed to true and trigger state change
        socialSection.isCollapsed = true;
        socialSection.onCollapsedStateChanged();
        
        expect(container1.classList.contains("hidden")).toBe(true);
        expect(container2.classList.contains("hidden")).toBe(true);
        
        // Set collapsed to false and trigger state change
        socialSection.isCollapsed = false;
        socialSection.onCollapsedStateChanged();
        
        expect(container1.classList.contains("hidden")).toBe(false);
        expect(container2.classList.contains("hidden")).toBe(false);
    });

    it("SocialSection does not crash with repeated state changes", () => {
        const container = document.createElement("div");
        const socialSection = new SocialSection("Test", container);
        
        expect(() => {
            socialSection.isCollapsed = true;
            socialSection.onCollapsedStateChanged();
            socialSection.isCollapsed = false;
            socialSection.onCollapsedStateChanged();
            socialSection.isCollapsed = true;
            socialSection.onCollapsedStateChanged();
        }).not.toThrow();
    });

    it("SocialSection stores label correctly", () => {
        const container = document.createElement("div");
        const label = "Test Label";
        const socialSection = new SocialSection(label, container);
        
        expect(socialSection.label).toBe(label);
    });

    it("SocialSection initializes isCollapsed state as false", () => {
        const socialSection = new SocialSection("Test");
        expect(socialSection.isCollapsed).toBe(false);
    });

    it("SocialSection element is created correctly", () => {
        const socialSection = new SocialSection("Test");
        expect(socialSection.element).toBeDefined();
        expect(socialSection.element.tagName.toLowerCase()).toBe("lol-social-roster-group");
    });
});
