import { describe, it, expect, vi } from "vitest";
import { RoleDropdown } from "./RoleDropdown.js";
vi.mock("https://cdn.jsdelivr.net/npm/balaclava-utils@latest", () => ({
    sleep: vi.fn(() => Promise.resolve()),
}), { virtual: true });
global.DataStore = { get: vi.fn(), set: vi.fn() };
global.document = { createElement: (tag) => ({ tagName: tag, classList: { add: () => {} }, setAttribute: () => {}, appendChild: () => {}, querySelector: () => null, addEventListener: () => {} }) };
describe("RoleDropdown", () => {
    it("creates element with correct tag name", () => {
        const roleDropdown = new RoleDropdown("Top", "primary-role");
        expect(roleDropdown.element).toBeDefined();
        expect(roleDropdown.element.tagName.toLowerCase()).toBe("lol-uikit-framed-dropdown");
    });
    it("stores text property", () => {
        const text = "Role";
        const roleDropdown = new RoleDropdown(text, "config-key");
        expect(roleDropdown.text).toBe(text);
    });
    it("stores configKey property", () => {
        const configKey = "role-key";
        const roleDropdown = new RoleDropdown("Test", configKey);
        expect(roleDropdown.configKey).toBe(configKey);
    });
});
