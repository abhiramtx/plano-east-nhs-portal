import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHoursSubmissionSchema, insertUserProfileSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Hours submissions routes
  app.get("/api/hours-submissions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const submissions = await storage.getHoursSubmissions(userId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hours submissions" });
    }
  });

  app.post("/api/hours-submissions", async (req, res) => {
    try {
      // Get user profile to populate student info
      const userProfile = await storage.getUserProfile(req.body.userId);
      if (!userProfile) {
        return res.status(400).json({ error: "User profile not found. Please complete your profile first." });
      }

      // Transform the date string to Date object and populate student info
      const requestData = {
        ...req.body,
        date: new Date(req.body.date),
        // Add student info from profile
        studentName: `${userProfile.goByFirstName} ${userProfile.lastName}`,
        studentId: userProfile.studentId,
      };
      
      const validatedData = insertHoursSubmissionSchema.parse(requestData);
      const submission = await storage.createHoursSubmission(validatedData);
      res.status(201).json(submission);
    } catch (error) {
      console.error("Submission validation error:", error);
      res.status(400).json({ error: "Invalid submission data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/hours-submissions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Transform the date string to Date object if present
      const requestData = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
        status: 'pending', // Reset status to pending when edited
        updatedAt: new Date(),
      };
      
      // Remove undefined values
      const cleanedData = Object.fromEntries(
        Object.entries(requestData).filter(([_, value]) => value !== undefined)
      );
      
      const submission = await storage.updateHoursSubmission(id, cleanedData);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Update submission error:", error);
      res.status(500).json({ error: "Failed to update submission" });
    }
  });

  app.delete("/api/hours-submissions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteHoursSubmission(id);
      
      if (!success) {
        return res.status(404).json({ error: "Submission not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete submission" });
    }
  });

  app.get("/api/hours-submissions", async (req, res) => {
    try {
      const submissions = await storage.getAllHoursSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all submissions" });
    }
  });

  // User profile routes
  app.get("/api/user-profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  app.put("/api/user-profile", async (req, res) => {
    try {
      console.log("Received profile data:", req.body);
      const validatedData = insertUserProfileSchema.parse(req.body);
      console.log("Validated profile data:", validatedData);
      const profile = await storage.upsertUserProfile(validatedData);
      console.log("Saved profile:", profile);
      res.json(profile);
    } catch (error) {
      console.error("Profile validation error:", error);
      res.status(400).json({ error: "Invalid profile data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Admin management routes
  app.get("/api/admin-profiles", async (req, res) => {
    try {
      const adminProfiles = await storage.getAdminProfiles();
      res.json(adminProfiles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin profiles" });
    }
  });

  app.post("/api/admin-profiles", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const result = await storage.promoteToAdmin(email);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: "Failed to add admin", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/admin-profiles/:emailKey", async (req, res) => {
    try {
      const { emailKey } = req.params;
      const result = await storage.removeAdmin(emailKey);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: "Failed to remove admin", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Admin assignment system
  app.get("/api/admin-assignment/:adminEmail", async (req, res) => {
    try {
      const { adminEmail } = req.params;
      console.log('Getting admin assignment for:', adminEmail);
      const assignment = await storage.getAdminAssignment(adminEmail);
      console.log('Assignment result:', assignment);
      res.json(assignment);
    } catch (error) {
      console.error('Admin assignment error:', error);
      res.status(500).json({ error: "Failed to get admin assignment" });
    }
  });

  app.post("/api/release-assignment", async (req, res) => {
    try {
      const { adminEmail, currentStudentId } = req.body;
      console.log('Release assignment request:', { adminEmail, currentStudentId });
      const result = await storage.releaseAssignment(adminEmail, currentStudentId);
      console.log('Release result:', result);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to release assignment" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
