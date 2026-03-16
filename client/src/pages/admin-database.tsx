import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { archiveYearData, wipeDatabase, Club } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Archive, Calendar, Database, Shield, Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminDatabaseProps {
  user: { name: string; email: string };
  club: Club;
}

export function AdminDatabase({ user, club }: AdminDatabaseProps) {
  const [schoolYear, setSchoolYear] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isWithinAllowedWindow = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const mayFirst = new Date(currentYear, 4, 1);
    const augFirst = new Date(currentYear, 7, 1);
    return now >= mayFirst && now <= augFirst;
  };

  const archiveYearMutation = useMutation({
    mutationFn: async (year: string) => {
      await archiveYearData(year);
    },
    onSuccess: () => {
      toast({ title: "Archived", description: "School year archived successfully." });
      setSchoolYear("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to archive", variant: "destructive" });
    },
  });

  const wipeDatabaseMutation = useMutation({
    mutationFn: async () => {
      await wipeDatabase();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-hours-logs'] });
      toast({ title: "Done", description: "Database wiped. Ready for new year." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to wipe", variant: "destructive" });
    },
  });

  const handleArchiveAndWipe = async () => {
    if (!schoolYear.trim()) {
      toast({ title: "Missing school year", description: "Enter a school year like 2024-2025", variant: "destructive" });
      return;
    }
    try {
      await archiveYearMutation.mutateAsync(schoolYear);
      await wipeDatabaseMutation.mutateAsync();
      toast({ title: "Year-end complete", description: "Year archived and database reset for new year." });
    } catch {}
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Database Management</h1>
              <p className="text-gray-600 mt-1">Year-end archival and data reset for {club.name}. Only available May 1 – Aug 1.</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-black rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6 max-w-2xl">
        {!isWithinAllowedWindow() && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">Operations Locked</p>
                  <p className="text-sm text-amber-700">Database operations are only available between May 1 and August 1 each year to prevent accidental mid-year data loss.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Archive className="w-5 h-5 text-blue-600" />
              <span>Year-End Archive & Reset</span>
            </CardTitle>
            <CardDescription>
              Archives all current submissions and hours logs under the given school year label, then wipes the active database so your club starts fresh. User profiles, clubs, memberships, and admin roles are preserved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="schoolYear">School Year Label</Label>
              <Input
                id="schoolYear"
                placeholder="e.g., 2024-2025"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                disabled={!isWithinAllowedWindow()}
              />
              <p className="text-xs text-gray-500">This label is attached to all archived entries so volunteers can find them in their History.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800 text-sm">What gets archived:</p>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>• All approved and pending hour submissions</li>
                    <li>• Hours log periods and their data</li>
                    <li>• Service request participation records</li>
                  </ul>
                  <p className="font-medium text-blue-800 text-sm mt-2">What is preserved:</p>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>• User profiles and admin roles</li>
                    <li>• Club and membership structure</li>
                    <li>• Historical archives from prior years</li>
                  </ul>
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={!isWithinAllowedWindow() || !schoolYear.trim() || archiveYearMutation.isPending || wipeDatabaseMutation.isPending}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {archiveYearMutation.isPending || wipeDatabaseMutation.isPending ? "Processing..." : "Archive Year & Reset Database"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span>Confirm Year-End Reset</span>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will archive the school year <strong>{schoolYear}</strong> and wipe all current submissions, hours logs, and participation records. Archived data will be viewable in History. <strong>This cannot be undone.</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchiveAndWipe} className="bg-red-600 hover:bg-red-700">
                    Yes, Archive & Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span>Safety Notes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Operations are time-locked to May 1 – Aug 1 to prevent accidental mid-year loss</li>
              <li>• Always archive before wiping — archived data is permanent and unrecoverable otherwise</li>
              <li>• Volunteers can view all archived years in their History tab after the reset</li>
              <li>• Club totals reset to zero — leaderboard standings restart for the new year</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
