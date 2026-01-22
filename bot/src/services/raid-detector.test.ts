import { RaidDetectorService } from "./raid-detector";

describe("RaidDetectorService", () => {
    let raidDetector: RaidDetectorService;

    beforeEach(() => {
        raidDetector = new RaidDetectorService();
    });

    it("should detect high frequency of sensitive commands from the same user", () => {
        const userId = "12345";
        const now = Math.floor(Date.now() / 1000);
        
        const logs = [
            { playerId: userId, command: ":ban", prcTimestamp: now },
            { playerId: userId, command: ":ban", prcTimestamp: now - 1 },
            { playerId: userId, command: ":ban", prcTimestamp: now - 2 },
            { playerId: userId, command: ":ban", prcTimestamp: now - 3 },
            { playerId: userId, command: ":ban", prcTimestamp: now - 4 },
            { playerId: userId, command: ":ban", prcTimestamp: now - 5 },
        ];

        const detections = raidDetector.scan(logs as any);
        expect(detections.some(d => d.type === "HIGH_FREQUENCY" && d.userId === userId)).toBe(true);
    });

    it("should detect mass action commands", () => {
        const logs = [
            { playerId: "67890", command: ":ban all", prcTimestamp: Math.floor(Date.now() / 1000) }
        ];

        const detections = raidDetector.scan(logs as any);
        expect(detections.some(d => d.type === "MASS_ACTION")).toBe(true);
    });

    it("should detect unauthorized commands", () => {
        const logs = [
            { playerId: "99999", command: ":ban user", prcTimestamp: Math.floor(Date.now() / 1000) }
        ];

        // If no authorizedMembers are provided, all sensitive commands are considered unauthorized
        const detections = raidDetector.scan(logs as any, []);
        expect(detections.some(d => d.type === "UNAUTHORIZED" && d.userId === "99999")).toBe(true);
    });

    it("should NOT flag authorized members as unauthorized", () => {
        const logs = [
            { playerId: "555", command: ":ban user", prcTimestamp: Math.floor(Date.now() / 1000) }
        ];

        const detections = raidDetector.scan(logs as any, ["555"]);
        expect(detections.some(d => d.type === "UNAUTHORIZED")).toBe(false);
    });
});
