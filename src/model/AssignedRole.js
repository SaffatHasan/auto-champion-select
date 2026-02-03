export class AssignedRole {
    constructor(value) {
        this.value = value;
    }

    static TOP = new AssignedRole("top");
    static JUNGLE = new AssignedRole("jungle");
    static MIDDLE = new AssignedRole("middle");
    static BOTTOM = new AssignedRole("bottom");
    static UTILITY = new AssignedRole("utility");
    static UNASSIGNED = new AssignedRole(null);

    static from_session(assignedPosition) {
        switch (assignedPosition) {
            case "top":
                return this.TOP;
            case "jungle":
                return this.JUNGLE;
            case "middle":
                return this.MIDDLE;
            case "bottom":
                return this.BOTTOM;
            case "utility":
                return this.UTILITY;
            default:
                return this.UNASSIGNED;
        }
    }
}
