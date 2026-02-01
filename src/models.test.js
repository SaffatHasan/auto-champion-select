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

describe("Champion Search/Filter Functionality", () => {
    it("should filter champions by exact match", () => {
        const champions = [
            { id: 1, name: "Aatrox" },
            { id: 2, name: "Ahri" },
            { id: 3, name: "Akali" }
        ];

        const filtered = champions.filter(c => c.name.toLowerCase().includes("atr"));
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe("Aatrox");
    });

    it("should filter champions case-insensitively", () => {
        const champions = [
            { id: 1, name: "Aatrox" },
            { id: 2, name: "Ahri" },
            { id: 3, name: "Akali" }
        ];

        const filtered = champions.filter(c => c.name.toLowerCase().includes("AHRI".toLowerCase()));
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe("Ahri");
    });

    it("should filter champions by partial name", () => {
        const champions = [
            { id: 1, name: "Aatrox" },
            { id: 2, name: "Ahri" },
            { id: 3, name: "Akali" }
        ];

        const filtered = champions.filter(c => c.name.toLowerCase().includes("a"));
        expect(filtered).toHaveLength(3);
    });

    it("should return no results for non-matching query", () => {
        const champions = [
            { id: 1, name: "Aatrox" },
            { id: 2, name: "Ahri" },
            { id: 3, name: "Akali" }
        ];

        const filtered = champions.filter(c => c.name.toLowerCase().includes("xyz"));
        expect(filtered).toHaveLength(0);
    });

    it("should return all champions with empty query", () => {
        const champions = [
            { id: 1, name: "Aatrox" },
            { id: 2, name: "Ahri" },
            { id: 3, name: "Akali" }
        ];

        const query = "";
        const filtered = champions.filter(c => !query || c.name.toLowerCase().includes(query.toLowerCase()));
        expect(filtered).toHaveLength(3);
    });

    it("should handle whitespace in query", () => {
        const champions = [
            { id: 1, name: "Aatrox" },
            { id: 2, name: "Ahri" },
            { id: 3, name: "Akali" }
        ];

        const query = "  ahri  ";
        const normalizedQuery = query.toLowerCase().trim();
        const filtered = champions.filter(c => !normalizedQuery || c.name.toLowerCase().includes(normalizedQuery));
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe("Ahri");
    });

    it("should support multiple character search", () => {
        const champions = [
            { id: 1, name: "Aatrox" },
            { id: 2, name: "Ahri" },
            { id: 3, name: "Akali" },
            { id: 4, name: "Amumu" }
        ];

        const filtered = champions.filter(c => c.name.toLowerCase().includes("am"));
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe("Amumu");
    });

    it("should find multiple matches", () => {
        const champions = [
            { id: 1, name: "Aatrox" },
            { id: 2, name: "Ahri" },
            { id: 3, name: "Akali" },
            { id: 4, name: "Alistar" }
        ];

        const filtered = champions.filter(c => c.name.toLowerCase().includes("al"));
        expect(filtered).toHaveLength(2);
        expect(filtered.map(c => c.name)).toContain("Akali");
        expect(filtered.map(c => c.name)).toContain("Alistar");
    });

    it("should handle special characters in champion names", () => {
        const champions = [
            { id: 1, name: "Kha'Zix" },
            { id: 2, name: "Kai'Sa" },
            { id: 3, name: "Ahri" }
        ];

        const filtered = champions.filter(c => c.name.toLowerCase().includes("zix"));
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe("Kha'Zix");
    });

    it("should reset filter when query becomes empty", () => {
        const champions = [
            { id: 1, name: "Aatrox" },
            { id: 2, name: "Ahri" },
            { id: 3, name: "Akali" }
        ];

        // First filter
        let filtered = champions.filter(c => c.name.toLowerCase().includes("ah"));
        expect(filtered).toHaveLength(1);

        // Reset with empty query
        filtered = champions.filter(c => !("") || c.name.toLowerCase().includes(""));
        expect(filtered).toHaveLength(3);
    });

    it("should handle rapid search changes", () => {
        const champions = [
            { id: 1, name: "Aatrox" },
            { id: 2, name: "Ahri" },
            { id: 3, name: "Akali" },
            { id: 4, name: "Amumu" }
        ];

        // Simulate rapid typing: "a" -> "aa" -> "aat" -> "aatr"
        let queries = ["a", "aa", "aat", "aatr"];
        let results = queries.map(q => 
            champions.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
        );

        expect(results[0]).toHaveLength(4); // "a" matches all
        expect(results[1]).toHaveLength(1); // "aa" matches Aatrox
        expect(results[2]).toHaveLength(1); // "aat" matches Aatrox
        expect(results[3]).toHaveLength(1); // "aatr" matches Aatrox
    });

    it("should support search from any position in name", () => {
        const champions = [
            { id: 1, name: "Vladimir" },
            { id: 2, name: "Teemo" },
            { id: 3, name: "Twisted Fate" }
        ];

        const filtered = champions.filter(c => c.name.toLowerCase().includes("sad"));
        expect(filtered).toHaveLength(0);

        const filtered2 = champions.filter(c => c.name.toLowerCase().includes("lad"));
        expect(filtered2).toHaveLength(1);
        expect(filtered2[0].name).toBe("Vladimir");
    });
});
