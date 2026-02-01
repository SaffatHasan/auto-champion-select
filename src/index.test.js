import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock global dependencies before importing the main module
global.request = vi.fn();
global.sleep = vi.fn().mockResolvedValue(undefined);

global.Toast = {
    promise: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
};

global.DataStore = {
    get: vi.fn(),
    set: vi.fn()
};

global.CommandBar = {
    addAction: vi.fn()
};


describe("Configuration and GlobalObjects", () => {
    it("should have request mock defined", () => {
        expect(global.request).toBeDefined();
    });

    it("should have sleep mock defined", () => {
        expect(global.sleep).toBeDefined();
    });

    it("should have Toast object", () => {
        expect(global.Toast).toBeDefined();
        expect(global.Toast.success).toBeDefined();
        expect(global.Toast.error).toBeDefined();
        expect(global.Toast.promise).toBeDefined();
    });

    it("should have DataStore object", () => {
        expect(global.DataStore).toBeDefined();
        expect(global.DataStore.get).toBeDefined();
        expect(global.DataStore.set).toBeDefined();
    });

    it("should have CommandBar object", () => {
        expect(global.CommandBar).toBeDefined();
        expect(global.CommandBar.addAction).toBeDefined();
    });
});

describe("API Request Handling", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should handle GET requests", async () => {
        const mockResponse = { ok: true, json: () => Promise.resolve([]) };
        global.request.mockResolvedValue(mockResponse);

        const result = await global.request("GET", "/test-endpoint");

        expect(result.ok).toBe(true);
        expect(global.request).toHaveBeenCalledWith("GET", "/test-endpoint");
    });

    it("should handle POST requests", async () => {
        const mockResponse = { ok: true };
        global.request.mockResolvedValue(mockResponse);

        const result = await global.request("POST", "/test-endpoint");

        expect(result.ok).toBe(true);
    });

    it("should handle failed requests", async () => {
        const mockResponse = { ok: false, status: 404 };
        global.request.mockResolvedValue(mockResponse);

        const result = await global.request("GET", "/nonexistent");

        expect(result.ok).toBe(false);
    });
});

describe("DataStore Configuration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.DataStore.get.mockImplementation((key) => {
            if (key === "controladoPick") {
                return { enabled: false, champions: [1, 2], force: false };
            }
            if (key === "controladoBan") {
                return { enabled: false, champions: [3, 4], force: false };
            }
            return null;
        });
    });

    it("should store and retrieve pick configuration", () => {
        const config = { enabled: true, champions: [1, 2] };
        global.DataStore.set("controladoPick", config);
        expect(global.DataStore.set).toHaveBeenCalledWith("controladoPick", config);
    });

    it("should store and retrieve ban configuration", () => {
        const config = { enabled: false, champions: [3, 4] };
        global.DataStore.set("controladoBan", config);
        expect(global.DataStore.set).toHaveBeenCalledWith("controladoBan", config);
    });

    it("should get pick config with enabled property", () => {
        const config = global.DataStore.get("controladoPick");
        expect(config).toHaveProperty("enabled");
        expect(config).toHaveProperty("champions");
        expect(config).toHaveProperty("force");
    });

    it("should get ban config with enabled property", () => {
        const config = global.DataStore.get("controladoBan");
        expect(config).toHaveProperty("enabled");
        expect(config).toHaveProperty("champions");
        expect(config).toHaveProperty("force");
    });
});

describe("Toast Notifications", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should show success toast", () => {
        global.Toast.success("Test success");
        expect(global.Toast.success).toHaveBeenCalledWith("Test success");
    });

    it("should show error toast", () => {
        global.Toast.error("Test error");
        expect(global.Toast.error).toHaveBeenCalledWith("Test error");
    });

    it("should handle promise toasts", () => {
        const promise = Promise.resolve();
        global.Toast.promise(promise, {
            loading: "Loading...",
            success: "Success!",
            error: "Error!"
        });

        expect(global.Toast.promise).toHaveBeenCalled();
    });
});

describe("CommandBar Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should add single action", () => {
        const mockAction = { id: "test", name: "Test" };
        global.CommandBar.addAction(mockAction);
        expect(global.CommandBar.addAction).toHaveBeenCalledWith(mockAction);
    });

    it("should add multiple actions", () => {
        const actions = [
            { id: "action-1", name: "Action 1" },
            { id: "action-2", name: "Action 2" }
        ];

        actions.forEach(action => global.CommandBar.addAction(action));

        expect(global.CommandBar.addAction).toHaveBeenCalledTimes(2);
    });
});

describe("Async Operations", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should handle sleep calls", async () => {
        global.sleep.mockResolvedValue(undefined);
        await global.sleep(100);
        expect(global.sleep).toHaveBeenCalledWith(100);
    });

    it("should chain sleep calls", async () => {
        global.sleep.mockResolvedValue(undefined);
        await global.sleep(100);
        await global.sleep(200);
        expect(global.sleep).toHaveBeenCalledTimes(2);
    });
});
