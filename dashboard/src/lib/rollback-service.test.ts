import { RollbackService } from "./rollback-service";

describe("RollbackService", () => {
    let rollbackService: RollbackService;

    beforeEach(() => {
        rollbackService = new RollbackService();
    });

    it("should reverse :ban commands", () => {
        const logs = [
            { id: "1", command: ":ban user1 reason" },
            { id: "2", command: ":ban user2" }
        ];

        const reversals = rollbackService.calculateReversals(logs as any);
        
        expect(reversals).toHaveLength(2);
        expect(reversals[0].command).toBe(":unban user1");
        expect(reversals[1].command).toBe(":unban user2");
    });

    it("should reverse :unadmin and :unmod commands", () => {
        const logs = [
            { id: "1", command: ":unadmin user1" },
            { id: "2", command: ":unmod user2" }
        ];

        const reversals = rollbackService.calculateReversals(logs as any);
        
        expect(reversals).toHaveLength(2);
        expect(reversals[0].command).toBe(":admin user1");
        expect(reversals[1].command).toBe(":mod user2");
    });

    it("should ignore irrelevant commands", () => {
        const logs = [
            { id: "1", command: ":fly me" },
            { id: "2", command: ":god me" }
        ];

        const reversals = rollbackService.calculateReversals(logs as any);
        
        expect(reversals).toHaveLength(0);
    });

    it("should handle mixed case and arguments", () => {
        const logs = [
            { id: "1", command: ":BAN user1" },
            { id: "2", command: ":UnAdmin user2" }
        ];

        const reversals = rollbackService.calculateReversals(logs as any);
        
        expect(reversals[0].command).toBe(":unban user1");
        expect(reversals[1].command).toBe(":admin user2");
    });
});
