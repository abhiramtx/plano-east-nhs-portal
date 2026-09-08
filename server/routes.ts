import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHoursSubmissionSchema, insertUserProfileSchema, insertProjectSchema, insertClubSchema, insertClubMembershipSchema, insertServiceRequestSchema, insertServiceParticipantSchema, insertCustomFieldSchema, insertCustomFieldValueSchema, insertHoursLogSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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
      const userProfile = await storage.getUserProfile(req.body.userId);
      if (!userProfile) {
        return res.status(400).json({ error: "User profile not found. Please complete your profile first." });
      }
      const membership = await storage.getUserClubMembership(req.body.userId);
      const requestData = {
        ...req.body,
        date: new Date(req.body.date),
        studentName: `${userProfile.goByFirstName} ${userProfile.lastName}`,
        studentId: userProfile.studentId,
        clubId: membership?.clubId || null,
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
      if (req.body.status && ['approved', 'rejected'].includes(req.body.status)) {
        const updateData = {
          status: req.body.status,
          rejectReason: req.body.rejectReason || null,
          updatedAt: new Date(),
        };
        const submission = await storage.updateHoursSubmission(id, updateData);
        if (!submission) return res.status(404).json({ error: "Submission not found" });
        res.json(submission);
      } else {
        const requestData = {
          ...req.body,
          date: req.body.date ? new Date(req.body.date) : undefined,
          status: 'pending',
          rejectReason: null,
          updatedAt: new Date(),
        };
        const cleanedData = Object.fromEntries(Object.entries(requestData).filter(([_, value]) => value !== undefined));
        const submission = await storage.updateHoursSubmission(id, cleanedData);
        if (!submission) return res.status(404).json({ error: "Submission not found" });
        res.json(submission);
      }
    } catch (error) {
      console.error("Update submission error:", error);
      res.status(500).json({ error: "Failed to update submission" });
    }
  });

  app.delete("/api/hours-submissions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteHoursSubmission(id);
      if (!success) return res.status(404).json({ error: "Submission not found" });
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

  app.get("/api/user-profiles", async (req, res) => {
    try {
      const profiles = await storage.getAllUserProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user profiles" });
    }
  });

  app.get("/api/user-profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getUserProfile(userId);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  app.put("/api/user-profile", async (req, res) => {
    try {
      const validatedData = insertUserProfileSchema.parse(req.body);
      const profile = await storage.upsertUserProfile(validatedData);
      res.json(profile);
    } catch (error) {
      console.error("Profile validation error:", error);
      res.status(400).json({ error: "Invalid profile data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/projects/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const projectsList = await storage.getUserProjects(userId);
      res.json(projectsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Project creation error:", error);
      res.status(400).json({ error: "Invalid project data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.updateProject(id, req.body);
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error) {
      console.error("Project update error:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProject(id);
      if (!success) return res.status(404).json({ error: "Project not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

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
      if (!email) return res.status(400).json({ error: "Email is required" });
      const result = await storage.promoteToAdmin(email);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: "Failed to add admin", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/admin-profiles/:emailKey", async (req, res) => {
    try {
      const { emailKey } = req.params;
      await storage.removeAdmin(emailKey);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to remove admin", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/admin-assignment/:adminEmail", async (req, res) => {
    try {
      const { adminEmail } = req.params;
      const assignment = await storage.getAdminAssignment(adminEmail);
      res.json(assignment);
    } catch (error) {
      console.error('Admin assignment error:', error);
      res.status(500).json({ error: "Failed to get admin assignment" });
    }
  });

  app.post("/api/release-assignment", async (req, res) => {
    try {
      const { adminEmail, currentStudentId } = req.body;
      const result = await storage.releaseAssignment(adminEmail, currentStudentId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to release assignment" });
    }
  });

  app.get("/api/yearly-history/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const history = await storage.getUserYearlyHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch yearly history" });
    }
  });

  app.post("/api/archive-year", async (req, res) => {
    try {
      const { schoolYear } = req.body;
      if (!schoolYear) return res.status(400).json({ error: "School year is required" });
      const now = new Date();
      const currentYear = now.getFullYear();
      const mayFirst = new Date(currentYear, 4, 1);
      const augFirst = new Date(currentYear, 7, 1);
      if (now < mayFirst || now > augFirst) {
        return res.status(403).json({ error: "Database operations are only allowed between May 1st and August 1st" });
      }
      await storage.archiveCurrentYear(schoolYear);
      res.json({ success: true, message: "Year archived successfully" });
    } catch (error) {
      console.error("Archive year error:", error);
      res.status(500).json({ error: "Failed to archive year" });
    }
  });

  app.post("/api/wipe-database", async (req, res) => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const mayFirst = new Date(currentYear, 4, 1);
      const augFirst = new Date(currentYear, 7, 1);
      if (now < mayFirst || now > augFirst) {
        return res.status(403).json({ error: "Database wipe is only allowed between May 1st and August 1st" });
      }
      await storage.wipeDatabaseForNewYear();
      res.json({ success: true, message: "Database wiped successfully" });
    } catch (error) {
      console.error("Database wipe error:", error);
      res.status(500).json({ error: "Failed to wipe database" });
    }
  });

  app.post("/api/remove-demo-data", async (req, res) => {
    try {
      await storage.removeDemoData();
      res.json({ success: true, message: "Demo data removed successfully" });
    } catch (error) {
      console.error("Remove demo data error:", error);
      res.status(500).json({ error: "Failed to remove demo data" });
    }
  });

  app.get("/api/clubs", async (req, res) => {
    try {
      const clubsList = await storage.getAllClubs();
      res.json(clubsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clubs" });
    }
  });

  // Lightweight public directory for the club picker. Keep passwords, logos,
  // coordinates, and page-specific fields out of the mobile initial payload.
  app.get("/api/clubs/directory", async (req, res) => {
    try {
      const clubsList = await storage.getAllClubs();
      res.json(clubsList.map((club: any) => ({
        id: club.id,
        name: club.name,
        description: club.description,
        color: club.color,
        isPrivate: Boolean(club.isPrivate),
        inviteCode: club.inviteCode,
        creatorEmail: club.creatorEmail,
        totalApprovedHours: Number(club.totalApprovedHours || 0),
        yearlyApprovedHours: Number(club.yearlyApprovedHours || 0),
        lastActivityAt: club.lastActivityAt,
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch club directory" });
    }
  });

  app.get("/api/clubs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const club = await storage.getClub(id);
      if (!club) return res.status(404).json({ error: "Club not found" });
      res.json(club);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch club" });
    }
  });

  app.post("/api/clubs", async (req, res) => {
    try {
      const existingClub = await storage.getClubByName(req.body.name);
      if (existingClub) return res.status(400).json({ error: "Club name already exists" });
      const existingMembership = await storage.getUserClubMembership(req.body.creatorEmail);
      if (existingMembership) return res.status(400).json({ error: "You are already a member of another club" });
      const validatedData = insertClubSchema.parse(req.body);
      const club = await storage.createClub(validatedData);
      await storage.createClubMembership({ clubId: club.id, userEmail: req.body.creatorEmail, role: 'admin' });
      const profile = await storage.getUserProfile(req.body.creatorEmail);
      if (profile) {
        await storage.upsertUserProfile({ ...profile, currentClubId: club.id });
      }
      res.status(201).json(club);
    } catch (error) {
      console.error("Club creation error:", error);
      res.status(400).json({ error: "Invalid club data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/clubs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const club = await storage.updateClub(id, req.body);
      if (!club) return res.status(404).json({ error: "Club not found" });
      res.json(club);
    } catch (error) {
      res.status(500).json({ error: "Failed to update club" });
    }
  });

  app.delete("/api/clubs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClub(id);
      if (!success) return res.status(404).json({ error: "Club not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete club" });
    }
  });

  app.get("/api/clubs/:id/members", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const members = await storage.getClubMemberships(id);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch club members" });
    }
  });

  app.post("/api/clubs/:id/join", async (req, res) => {
    try {
      const clubId = parseInt(req.params.id);
      const { userEmail, password } = req.body;
      const club = await storage.getClub(clubId);
      if (!club) return res.status(404).json({ error: "Club not found" });
      if (club.isPrivate && club.password !== password) {
        return res.status(403).json({ error: "Incorrect password" });
      }
      const existingMembership = await storage.getUserClubMembership(userEmail);
      if (existingMembership) return res.status(400).json({ error: "You are already a member of another club" });
      const membership = await storage.createClubMembership({ clubId, userEmail, role: 'member' });
      const profile = await storage.getUserProfile(userEmail);
      if (profile) {
        await storage.upsertUserProfile({ ...profile, currentClubId: clubId });
      }
      res.status(201).json(membership);
    } catch (error) {
      console.error("Join club error:", error);
      res.status(400).json({ error: "Failed to join club" });
    }
  });

  app.post("/api/clubs/:id/leave", async (req, res) => {
    try {
      const clubId = parseInt(req.params.id);
      const { userEmail } = req.body;
      const membership = await storage.getClubMembershipByEmailAndClub(userEmail, clubId);
      if (!membership) return res.status(404).json({ error: "Membership not found" });
      await storage.deleteClubMembership(membership.id);
      const profile = await storage.getUserProfile(userEmail);
      if (profile) {
        await storage.upsertUserProfile({ ...profile, currentClubId: null });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to leave club" });
    }
  });

  app.post("/api/clubs/:id/kick", async (req, res) => {
    try {
      const clubId = parseInt(req.params.id);
      const { userEmail, adminEmail } = req.body;
      const adminMembership = await storage.getClubMembershipByEmailAndClub(adminEmail, clubId);
      if (!adminMembership || adminMembership.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can kick members" });
      }
      const membership = await storage.getClubMembershipByEmailAndClub(userEmail, clubId);
      if (!membership) return res.status(404).json({ error: "Member not found" });
      await storage.deleteClubMembership(membership.id);
      const profile = await storage.getUserProfile(userEmail);
      if (profile) {
        await storage.upsertUserProfile({ ...profile, currentClubId: null });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to kick member" });
    }
  });

  app.get("/api/user-club/:userEmail", async (req, res) => {
    try {
      const { userEmail } = req.params;
      const membership = await storage.getUserClubMembership(userEmail);
      if (!membership) return res.json(null);
      const club = await storage.getClub(membership.clubId);
      res.json({ membership, club });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user club" });
    }
  });

  // Territory Circles
  app.get("/api/clubs/:id/territories", async (req, res) => {
    try {
      const clubId = req.params.id;
      const circles = await storage.calculateAndUpdateTerritoryCircles(clubId);
      console.log(`Territory circles for ${clubId}:`, circles.length, circles);
      res.json(circles);
    } catch (error) {
      console.error("Error fetching territory circles:", error);
      res.status(500).json({ error: "Failed to fetch territory circles" });
    }
  });

  app.get("/api/clubs/:id/member-territories", async (req, res) => {
    try {
      const circles = await storage.calculateMemberTerritories(req.params.id);
      res.json(circles);
    } catch (error) {
      console.error("Error fetching member territories:", error);
      res.status(500).json({ error: "Failed to fetch member territories" });
    }
  });

  app.post("/api/clubs/:id/territories/update", async (req, res) => {
    try {
      const clubId = req.params.id;
      const circles = await storage.calculateAndUpdateTerritoryCircles(clubId);
      res.json(circles);
    } catch (error) {
      console.error("Error updating territory circles:", error);
      res.status(500).json({ error: "Failed to update territory circles" });
    }
  });

  app.get("/api/leaderboard/clubs", async (req, res) => {
    try {
      const period = (req.query.period as string) || 'all';
      const clubsList = await storage.getClubLeaderboard(period);
      res.json(clubsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch club leaderboard" });
    }
  });

  app.get("/api/leaderboard/members/:clubId", async (req, res) => {
    try {
      const clubId = parseInt(req.params.clubId);
      const members = await storage.getMemberLeaderboard(clubId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch member leaderboard" });
    }
  });

  app.get("/api/service-requests", async (req, res) => {
    try {
      const requests = await storage.getAllServiceRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service requests" });
    }
  });

  app.get("/api/service-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getServiceRequest(id);
      if (!request) return res.status(404).json({ error: "Service request not found" });
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service request" });
    }
  });

  app.post("/api/service-requests", async (req, res) => {
    try {
      const validatedData = insertServiceRequestSchema.parse({
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      });
      const request = await storage.createServiceRequest(validatedData);
      res.status(201).json(request);
    } catch (error) {
      console.error("Service request creation error:", error);
      res.status(400).json({ error: "Invalid service request data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/service-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.updateServiceRequest(id, req.body);
      if (!request) return res.status(404).json({ error: "Service request not found" });
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to update service request" });
    }
  });

  app.delete("/api/service-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteServiceRequest(id);
      if (!success) return res.status(404).json({ error: "Service request not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete service request" });
    }
  });

  app.get("/api/service-requests/:id/participants", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const participants = await storage.getServiceParticipants(id);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  app.post("/api/service-requests/:id/join", async (req, res) => {
    try {
      const serviceRequestId = parseInt(req.params.id);
      const { userEmail, userName } = req.body;
      const membership = await storage.getUserClubMembership(userEmail);
      const participant = await storage.createServiceParticipant({
        serviceRequestId,
        userEmail,
        userName,
        clubId: membership?.clubId || null,
      });
      res.status(201).json(participant);
    } catch (error) {
      console.error("Join service request error:", error);
      res.status(400).json({ error: "Failed to join service request" });
    }
  });

  app.post("/api/service-participants/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { hoursAwarded, requesterEmail } = req.body;
      const participant = await storage.getServiceParticipant(id);
      if (!participant) return res.status(404).json({ error: "Participant not found" });
      const serviceRequest = await storage.getServiceRequest(participant.serviceRequestId);
      if (!serviceRequest) return res.status(404).json({ error: "Service request not found" });
      if (serviceRequest.requesterEmail !== requesterEmail) {
        return res.status(403).json({ error: "Only the requester can approve hours" });
      }
      const updatedParticipant = await storage.updateServiceParticipant(id, {
        hoursAwarded: hoursAwarded.toString(),
        hoursApproved: true,
        completedAt: new Date(),
      });
      if (updatedParticipant && updatedParticipant.clubId) {
        const profile = await storage.getUserProfile(updatedParticipant.userEmail);
        const bonusMultiplier = serviceRequest.isHighNeedArea ? 1.5 : 1;
        const bonusHours = serviceRequest.isHighNeedArea ? (parseFloat(hoursAwarded) * 0.5).toString() : "0";
        await storage.createHoursSubmission({
          userId: updatedParticipant.userEmail,
          clubId: updatedParticipant.clubId,
          activityName: serviceRequest.title,
          studentName: profile ? `${profile.goByFirstName} ${profile.lastName}` : updatedParticipant.userName,
          studentId: profile?.studentId || null,
          description: `Service request: ${serviceRequest.description}`,
          date: new Date(),
          hours: hoursAwarded.toString(),
          status: 'approved',
          serviceRequestId: serviceRequest.id,
          isHighNeedArea: serviceRequest.isHighNeedArea || false,
          bonusHoursAwarded: bonusHours,
          locationLat: serviceRequest.locationLat,
          locationLng: serviceRequest.locationLng,
        });
      }
      res.json(updatedParticipant);
    } catch (error) {
      console.error("Approve hours error:", error);
      res.status(500).json({ error: "Failed to approve hours" });
    }
  });

  app.delete("/api/service-participants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteServiceParticipant(id);
      if (!success) return res.status(404).json({ error: "Participant not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove participant" });
    }
  });

  app.get("/api/high-need-areas", async (req, res) => {
    try {
      const areas = await storage.getAllHighNeedAreas();
      res.json(areas);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch high need areas" });
    }
  });

  app.post("/api/high-need-areas", async (req, res) => {
    try {
      const area = await storage.createHighNeedArea(req.body);
      res.status(201).json(area);
    } catch (error) {
      res.status(400).json({ error: "Failed to create high need area" });
    }
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAllAppSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getAppSetting(key);
      res.json(setting || { settingKey: key, settingValue: '' });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const { settingKey, settingValue, settingType, description } = req.body;
      const setting = await storage.upsertAppSetting({ settingKey, settingValue, settingType, description });
      res.json(setting);
    } catch (error) {
      res.status(400).json({ error: "Failed to update setting" });
    }
  });

  app.get("/api/territories", async (req, res) => {
    try {
      const clubsList = await storage.getAllClubs();
      const territories = clubsList.map(club => ({
        id: club.id,
        name: club.name,
        color: club.color,
        x: parseFloat(club.territoryX),
        y: parseFloat(club.territoryY),
        radius: Math.max(20, Math.sqrt(parseFloat(club.totalApprovedHours) + parseFloat(club.bonusHours) - parseFloat(club.decayedHours)) * 10),
        totalHours: parseFloat(club.totalApprovedHours) + parseFloat(club.bonusHours) - parseFloat(club.decayedHours),
        rawHours: parseFloat(club.totalApprovedHours),
        bonusHours: parseFloat(club.bonusHours),
        decayedHours: parseFloat(club.decayedHours),
      }));
      res.json(territories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch territories" });
    }
  });

  app.post("/api/apply-decay", async (req, res) => {
    try {
      await storage.applyTerritoryDecay();
      res.json({ success: true, message: "Decay applied successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to apply decay" });
    }
  });

  // Custom Fields Routes
  app.post("/api/custom-fields", async (req, res) => {
    try {
      const validatedData = insertCustomFieldSchema.parse(req.body);
      const field = await storage.createCustomField(validatedData);
      res.status(201).json(field);
    } catch (error) {
      console.error("Custom field creation error:", error);
      res.status(400).json({ error: "Invalid custom field data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/custom-fields/:clubId", async (req, res) => {
    try {
      const { clubId } = req.params;
      const fields = await storage.getCustomFields(clubId);
      res.json(fields);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom fields" });
    }
  });

  app.get("/api/custom-fields-by-id/:fieldId", async (req, res) => {
    try {
      const { fieldId } = req.params;
      const field = await storage.getCustomField(fieldId);
      if (!field) return res.status(404).json({ error: "Custom field not found" });
      res.json(field);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom field" });
    }
  });

  app.put("/api/custom-fields/:fieldId", async (req, res) => {
    try {
      const { fieldId } = req.params;
      const field = await storage.updateCustomField(fieldId, req.body);
      if (!field) return res.status(404).json({ error: "Custom field not found" });
      res.json(field);
    } catch (error) {
      console.error("Custom field update error:", error);
      res.status(500).json({ error: "Failed to update custom field" });
    }
  });

  app.delete("/api/custom-fields/:fieldId", async (req, res) => {
    try {
      const { fieldId } = req.params;
      const success = await storage.deleteCustomField(fieldId);
      if (!success) return res.status(404).json({ error: "Custom field not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete custom field" });
    }
  });

  // Custom Field Values Routes
  app.post("/api/custom-field-values", async (req, res) => {
    try {
      const validatedData = insertCustomFieldValueSchema.parse(req.body);
      const value = await storage.createCustomFieldValue(validatedData);
      res.status(201).json(value);
    } catch (error) {
      console.error("Custom field value creation error:", error);
      res.status(400).json({ error: "Invalid custom field value data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/custom-field-values/:userId/:clubId", async (req, res) => {
    try {
      const { userId, clubId } = req.params;
      const values = await storage.getCustomFieldValues(userId, clubId);
      res.json(values);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom field values" });
    }
  });

  app.put("/api/custom-field-values/:userId/:customFieldId", async (req, res) => {
    try {
      const { userId, customFieldId } = req.params;
      const { clubId, value } = req.body;
      const fieldValue = await storage.upsertCustomFieldValue(userId, customFieldId, clubId, value);
      res.json(fieldValue);
    } catch (error) {
      console.error("Custom field value upsert error:", error);
      res.status(500).json({ error: "Failed to upsert custom field value" });
    }
  });

  // Hours Logs
  app.post("/api/hours-logs", async (req, res) => {
    try {
      const validatedData = insertHoursLogSchema.parse(req.body);
      const log = await storage.createHoursLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      console.error("Hours log creation error:", error);
      res.status(400).json({ error: "Invalid hours log data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/hours-logs/:clubId", async (req, res) => {
    try {
      const { clubId } = req.params;
      let logs = await storage.getHoursLogs(clubId);

      // Always ensure the non-deleteable Sub-Club Hours system log exists
      const hasSystemLog = logs.some(l => (l as any).isSystem);
      if (!hasSystemLog) {
        await storage.createHoursLog({
          clubId,
          name: "Sub-Club Hours",
          hoursRequired: 0,
          isOpen: true,
          isSystem: true,
        });
        logs = await storage.getHoursLogs(clubId);
      }

      // Ensure at least one regular (non-system) log exists for new clubs
      const hasRegularLog = logs.some(l => !(l as any).isSystem);
      if (!hasRegularLog) {
        await storage.createHoursLog({
          clubId,
          name: "Log 1",
          hoursRequired: 15,
          isOpen: true,
        });
        logs = await storage.getHoursLogs(clubId);
      }

      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hours logs" });
    }
  });

  app.put("/api/hours-logs/:logId", async (req, res) => {
    try {
      const { logId } = req.params;
      const log = await storage.updateHoursLog(logId, req.body);
      if (!log) return res.status(404).json({ error: "Hours log not found" });
      res.json(log);
    } catch (error) {
      console.error("Hours log update error:", error);
      res.status(500).json({ error: "Failed to update hours log" });
    }
  });

  app.delete("/api/hours-logs/:logId", async (req, res) => {
    try {
      const { logId } = req.params;
      const deleted = await storage.deleteHoursLog(logId);
      if (!deleted) return res.status(404).json({ error: "Hours log not found" });
      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message.includes("System logs")) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete hours log" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
