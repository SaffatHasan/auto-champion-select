import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChampionSelectPick } from "./ChampionSelectPick.js";
import { AssignedRole } from "./AssignedRole.js";

global.DataStore = { get: vi.fn(), set: vi.fn() };
global.MutationObserver = class { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} };

vi.mock("https://cdn.jsdelivr.net/npm/balaclava-utils@latest", () => ({
    request: vi.fn(),
    sleep: vi.fn(() => Promise.resolve()),
}), { virtual: true });

describe("ChampionSelectPick", () => {
    let cs;
    beforeEach(() => {
        vi.clearAllMocks();
        cs = new ChampionSelectPick();
        cs.stopWatch();
    });
    afterEach(() => { cs.stopWatch(); });
    it("initializes currentRole as UNASSIGNED", () => {
        expect(cs.currentRole).toBe(AssignedRole.UNASSIGNED);
    });
    it("getAssignedRole returns role or UNASSIGNED", () => {
        const myTeam = [ { cellId: 1, assignedPosition: "top" }, { cellId: 2, assignedPosition: "jungle" } ];
        expect(cs.getAssignedRole(myTeam, 1)).toBe(AssignedRole.TOP);
        expect(cs.getAssignedRole(myTeam, 999)).toBe(AssignedRole.UNASSIGNED);
    });
    it("detects banned/picked/intents correctly", () => {
        cs.allBans = [1,2,3];
        cs.teamIntents = [4,5];
        cs.allPicks = [{ championId: 6 }, { championId: 7 }];
        expect(cs.isChampionAlreadyBanned(1)).toBe(true);
        expect(cs.isChampionAlreadyBanned(999)).toBe(false);
        expect(cs.isChampionInTeamIntents(4)).toBe(true);
        expect(cs.isChampionInTeamIntents(999)).toBe(false);
        expect(cs.isChampionAlreadyPicked(6)).toBe(true);
        expect(cs.isChampionAlreadyPicked(999)).toBe(false);
    });
});
