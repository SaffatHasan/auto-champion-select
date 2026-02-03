import { describe, it, expect, vi } from "vitest";
import { Dropdown } from "./Dropdown.js";
vi.mock("https://cdn.jsdelivr.net/npm/balaclava-utils@latest", () => ({
    sleep: vi.fn(() => Promise.resolve()),
}), { virtual: true });
global.DataStore = { get: vi.fn(), set: vi.fn() };
global.document = { createElement: (tag) => ({ tagName: tag, classList: { add: () => {} }, setAttribute: () => {}, appendChild: () => {}, querySelector: () => null, addEventListener: () => {} }) };
describe("Dropdown", () => {
    it("creates element with correct tag name", () => {
        const dropdown = new Dropdown("Test", "test-config", 0, async () => []);
        expect(dropdown.element).toBeDefined();
        expect(dropdown.element.tagName.toLowerCase()).toBe("lol-uikit-framed-dropdown");
    });
    it("stores text property", () => {
        const text = "Champion Pick";
        const dropdown = new Dropdown(text, "config-key", 0, async () => []);
        expect(dropdown.text).toBe(text);
    });
    it("stores configKey property", () => {
        const configKey = "primary-pick";
        const dropdown = new Dropdown("Test", configKey, 1, async () => []);
        expect(dropdown.configKey).toBe(configKey);
    });
});
