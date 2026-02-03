import { describe, it, expect, vi } from "vitest";
import { Checkbox } from "./Checkbox.js";
global.DataStore = { get: vi.fn(), set: vi.fn() };
global.document = { createElement: (tag) => ({ tagName: tag, classList: { add: () => {} }, setAttribute: () => {}, appendChild: () => {}, querySelector: () => null, addEventListener: () => {} }) };
describe("Checkbox", () => {
    it("creates element with correct tag name", () => {
        const checkbox = new Checkbox("Test", "test-config");
        expect(checkbox.element).toBeDefined();
        expect(checkbox.element.tagName.toLowerCase()).toBe("lol-uikit-radio-input-option");
    });
    it("stores text in element", () => {
        const text = "Enable Feature";
        const checkbox = new Checkbox(text, "config-key");
        expect(checkbox.element.innerText).toBe(text);
    });
    it("stores configKey property", () => {
        const configKey = "feature-enabled";
        const checkbox = new Checkbox("Test", configKey);
        expect(checkbox.configKey).toBe(configKey);
    });
});
