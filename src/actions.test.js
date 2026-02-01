import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the global objects BEFORE importing the module
global.Toast = {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn((promise, options) => {
        return promise.then(
            result => options.success && Toast.success(options.success),
            error => options.error && Toast.error(options.error)
        );
    })
};

global.DataStore = {
    get: vi.fn(),
    set: vi.fn()
};

global.CommandBar = {
    addAction: vi.fn()
};

// Now import after mocks are in place
import {
    AutoPickSwitchAction,
    AutoBanSwitchAction,
    ForcePickSwitchAction,
    ForceBanSwitchAction,
    RefreshDropdownsAction,
    addActions
} from "./actions.js";

describe("AutoPickSwitchAction", () => {
    let action;
    let callbackMock;

    beforeEach(() => {
        vi.clearAllMocks();
        callbackMock = vi.fn().mockReturnValue(true);
        action = new AutoPickSwitchAction(callbackMock);
    });

    it("should have correct id", () => {
        expect(action.id).toBe("controladoPickSwitch");
    });

    it("should have correct tags", () => {
        expect(action.tags).toContain("controladoPick");
        expect(action.tags).toContain("switch");
    });

    it("should toggle and show success toast", () => {
        action.perform();
        expect(callbackMock).toHaveBeenCalled();
        expect(Toast.success).toHaveBeenCalled();
    });

    it("should show error toast on exception", () => {
        callbackMock.mockImplementation(() => {
            throw new Error("Test error");
        });
        action.perform();
        expect(Toast.error).toHaveBeenCalledWith("Failed to toggle Auto Pick. Check console.");
    });

    it("should show correct toast message when enabled", () => {
        global.DataStore.get.mockReturnValue({ enabled: true });
        const message = action.name();
        expect(message).toContain("ON");
    });

    it("should show correct toast message when disabled", () => {
        global.DataStore.get.mockReturnValue({ enabled: false });
        const message = action.name();
        expect(message).toContain("OFF");
    });
});

describe("AutoBanSwitchAction", () => {
    let action;
    let callbackMock;

    beforeEach(() => {
        vi.clearAllMocks();
        callbackMock = vi.fn().mockReturnValue(true);
        action = new AutoBanSwitchAction(callbackMock);
    });

    it("should have correct id", () => {
        expect(action.id).toBe("controladoBanSwitch");
    });

    it("should handle callback correctly", () => {
        action.perform();
        expect(callbackMock).toHaveBeenCalled();
    });
});

describe("ForcePickSwitchAction", () => {
    let action;

    beforeEach(() => {
        vi.clearAllMocks();
        global.DataStore.get.mockReturnValue({ force: false });
        action = new ForcePickSwitchAction();
    });

    it("should have correct id", () => {
        expect(action.id).toBe("controladoPickForceSwitch");
    });

    it("should toggle force state in DataStore", () => {
        action.perform();
        expect(global.DataStore.set).toHaveBeenCalled();
        const config = global.DataStore.set.mock.calls[0][1];
        expect(config.force).toBe(true);
    });

    it("should show correct legend when force is OFF", () => {
        global.DataStore.get.mockReturnValue({ force: false });
        const legend = action.legend();
        expect(legend).toContain("Ignore team intent");
    });

    it("should show correct legend when force is ON", () => {
        global.DataStore.get.mockReturnValue({ force: true });
        const legend = action.legend();
        expect(legend).toContain("Ignore team intent");
    });
});

describe("ForceBanSwitchAction", () => {
    let action;

    beforeEach(() => {
        vi.clearAllMocks();
        global.DataStore.get.mockReturnValue({ force: false });
        action = new ForceBanSwitchAction();
    });

    it("should have correct id", () => {
        expect(action.id).toBe("controladoBanForceSwitch");
    });

    it("should toggle force state correctly", () => {
        action.perform();
        expect(global.DataStore.set).toHaveBeenCalled();
    });
});

describe("RefreshDropdownsAction", () => {
    let action;
    let dropdownMocks;

    beforeEach(() => {
        vi.clearAllMocks();
        dropdownMocks = [
            { refresh: vi.fn() },
            { refresh: vi.fn() }
        ];
        action = new RefreshDropdownsAction(dropdownMocks);
    });

    it("should have correct id", () => {
        expect(action.id).toBe("RefreshDropdowns");
    });

    it("should refresh all dropdowns", () => {
        action.perform();
        dropdownMocks.forEach(dropdown => {
            expect(dropdown.refresh).toHaveBeenCalled();
        });
    });

    it("should show success message", () => {
        action.perform();
        expect(Toast.success).toHaveBeenCalledWith("Refreshed Dropdowns!");
    });

    it("should handle empty dropdown array", () => {
        const emptyAction = new RefreshDropdownsAction([]);
        emptyAction.perform();
        expect(Toast.success).toHaveBeenCalled();
    });
});

describe("addActions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should add multiple actions to CommandBar", () => {
        const actions = [
            new AutoPickSwitchAction(vi.fn()),
            new AutoBanSwitchAction(vi.fn()),
            new ForcePickSwitchAction()
        ];

        addActions(actions);

        expect(global.CommandBar.addAction).toHaveBeenCalledTimes(3);
    });

    it("should handle empty actions array", () => {
        vi.clearAllMocks();
        addActions([]);
        expect(global.CommandBar.addAction).not.toHaveBeenCalled();
    });
});

describe("Action Promise handling", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should handle async callbacks with promise", async () => {
        const asyncCallback = vi.fn().mockResolvedValue(true);
        const action = new AutoPickSwitchAction(asyncCallback);

        await action.perform();

        expect(asyncCallback).toHaveBeenCalled();
    });
});
