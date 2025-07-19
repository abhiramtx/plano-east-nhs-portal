// Simple in-memory assignment tracking for admin rotation
interface AssignmentState {
  lastAssignedUserId: string | null;
  assignmentTimestamp: number;
}

class AssignmentTracker {
  private adminStates = new Map<string, AssignmentState>();
  
  setLastAssignment(adminEmail: string, userId: string) {
    this.adminStates.set(adminEmail, {
      lastAssignedUserId: userId,
      assignmentTimestamp: Date.now()
    });
  }
  
  getLastAssignment(adminEmail: string): string | null {
    const state = this.adminStates.get(adminEmail);
    if (!state) return null;
    
    // Reset after 5 minutes to avoid stale state
    if (Date.now() - state.assignmentTimestamp > 5 * 60 * 1000) {
      this.adminStates.delete(adminEmail);
      return null;
    }
    
    return state.lastAssignedUserId;
  }
  
  clearAssignment(adminEmail: string) {
    this.adminStates.delete(adminEmail);
  }
}

export const assignmentTracker = new AssignmentTracker();