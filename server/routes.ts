import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHoursSubmissionSchema } from "@shared/schema";

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

  const httpServer = createServer(app);

  return httpServer;
}
