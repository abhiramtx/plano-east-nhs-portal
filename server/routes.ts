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
      // Transform the date string to Date object before validation
      const requestData = {
        ...req.body,
        date: new Date(req.body.date),
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
      const updates = req.body;
      const submission = await storage.updateHoursSubmission(id, updates);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
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

  const httpServer = createServer(app);

  return httpServer;
}
