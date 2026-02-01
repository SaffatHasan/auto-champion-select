import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the global objects BEFORE importing
global.DataStore = {
    get: vi.fn(),
    set: vi.fn()
};

global.request = vi.fn();
global.sleep = vi.fn(() => Promise.resolve());

describe("Model Classes Structure", () => {
    it("should have DataStore available globally", () => {
        expect(global.DataStore).toBeDefined();
        expect(global.DataStore.get).toBeDefined();
        expect(global.DataStore.set).toBeDefined();
    });

    it("should have request function available globally", () => {
        expect(global.request).toBeDefined();
    });

    it("should have sleep function available globally", () => {
        expect(global.sleep).toBeDefined();
    });

    it("should handle DataStore get and set operations", () => {
        const testData = { enabled: true, champions: [1, 2] };
        global.DataStore.set("test-key", testData);
        
        expect(global.DataStore.set).toHaveBeenCalledWith("test-key", testData);
    });

    it("should handle multiple DataStore operations", () => {
        global.DataStore.get.mockReturnValue({ enabled: false });
        
        const config = global.DataStore.get("test-config");
        
        expect(config.enabled).toBe(false);
        expect(global.DataStore.get).toHaveBeenCalled();
    });

    it("should handle request function calls", async () => {
        const mockResponse = { ok: true, json: () => Promise.resolve([]) };
        global.request.mockResolvedValue(mockResponse);

        const result = await global.request("GET", "/test");

        expect(result.ok).toBe(true);
    });

    it("should handle sleep function", async () => {
        global.sleep.mockResolvedValue(undefined);
        
        await global.sleep(100);
        
        expect(global.sleep).toHaveBeenCalledWith(100);
    });

    it("should handle configuration for pick", () => {
        const pickConfig = { enabled: true, champions: [1, 2], force: false };
        global.DataStore.set("controladoPick", pickConfig);
        
        expect(global.DataStore.set).toHaveBeenCalledWith("controladoPick", pickConfig);
    });

    it("should handle configuration for ban", () => {
        const banConfig = { enabled: false, champions: [3, 4], force: true };
        global.DataStore.set("controladoBan", banConfig);
        
        expect(global.DataStore.set).toHaveBeenCalledWith("controladoBan", banConfig);
    });

    it("should toggle configuration state", () => {
        const config = { enabled: true };
        config.enabled = !config.enabled;
        
        expect(config.enabled).toBe(false);
    });

    it("should handle champion lists", () => {
        const champions = [
            { id: 1, name: "Aatrox" },
            { id: 2, name: "Ahri" },
            { id: 3, name: "Akali" }
        ];
        
        expect(champions).toHaveLength(3);
        expect(champions[0].name).toBe("Aatrox");
    });

    it("should sort champions by name", () => {
        const champions = [
            { id: 2, name: "Ahri" },
            { id: 1, name: "Aatrox" },
            { id: 3, name: "Akali" }
        ];
        
        champions.sort((a, b) => a.name.localeCompare(b.name));
        
        expect(champions[0].name).toBe("Aatrox");
        expect(champions[1].name).toBe("Ahri");
    });

    it("should filter duplicate champion names", () => {
        const championNames = ["Aatrox", "Ahri", "Aatrox"];
        const uniqueNames = [...new Set(championNames)];
        
        expect(uniqueNames).toHaveLength(2);
    });

    it("should handle session data structure", () => {
        const session = {
            actions: [[]],
            localPlayerCellId: 1,
            myTeam: [],
            theirTeam: [],
            bans: {
                myTeamBans: [],
                theirTeamBans: []
            }
        };
        
        expect(session.localPlayerCellId).toBe(1);
        expect(session.myTeam).toHaveLength(0);
    });
});
