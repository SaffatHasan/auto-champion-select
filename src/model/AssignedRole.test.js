import { describe, it, expect } from "vitest";
import { AssignedRole } from "./AssignedRole.js";

describe("AssignedRole", () => {
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
