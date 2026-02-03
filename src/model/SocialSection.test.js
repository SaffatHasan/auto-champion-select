import { describe, it, expect, vi } from "vitest";
import { SocialSection } from "./SocialSection.js";
global.document = { createElement: (tag) => ({ tagName: tag, classList: { add: () => {}, remove: () => {}, contains: () => false }, setAttribute: () => {}, appendChild: () => {}, querySelector: () => null, addEventListener: () => {} }) };
global.MutationObserver = class { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} };
describe("SocialSection", () => {
    it("creates element with correct tag name", () => {
        const socialSection = new SocialSection("Test");
        expect(socialSection.element).toBeDefined();
        expect(socialSection.element.tagName.toLowerCase()).toBe("lol-social-roster-group");
    });
    it("stores label correctly", () => {
        const label = "Test Label";
        const socialSection = new SocialSection(label);
        expect(socialSection.label).toBe(label);
    });
});
