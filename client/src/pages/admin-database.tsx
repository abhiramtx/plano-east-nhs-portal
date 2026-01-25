import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { archiveYearData, wipeDatabase, removeDemoData } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  Archive, 
  Trash2, 
  Calendar, 
  Database,
  Shield,
  Clock
} from "lucide-react";
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
}

export function AdminDatabase({ user }: AdminDatabaseProps) {
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
    mutationFn: async (schoolYear: string) => {
      await archiveYearData(schoolYear);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Current year archived successfully",
      });
      setSchoolYear("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive year",
        variant: "destructive",
      });
    },
  });

  const wipeDatabaseMutation = useMutation({
    mutationFn: async () => {
      await wipeDatabase();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-user-profiles'] });
      toast({
        title: "Success",
        description: "Database wiped successfully for new year",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to wipe database",
        variant: "destructive",
      });
    },
  });

  const removeDemoDataMutation = useMutation({
    mutationFn: async () => {
      await removeDemoData();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-user-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-submissions'] });
      toast({
        title: "Success",
        description: "Demo data removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove demo data",
        variant: "destructive",
      });
    },
  });

  const handleArchiveAndWipe = async () => {
    if (!schoolYear.trim()) {
      toast({
        title: "Error",
        description: "Please enter a school year (e.g., 2024-2025)",
        variant: "destructive",
      });
      return;
    }

    try {
      await archiveYearMutation.mutateAsync(schoolYear);
      await wipeDatabaseMutation.mutateAsync();
      
      toast({
        title: "Complete",
        description: "Year archived and database prepared for new year",
      });
    } catch (error) {
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Database Management</h1>
              <p className="text-gray-600 mt-1">Year-end operations and data management</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg">
                <Database className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {!isWithinAllowedWindow() && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Operations Restricted</p>
                  <p className="text-sm text-amber-700">
                    Database operations are only allowed between May 1st and August 1st each year.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Archive className="w-5 h-5 text-blue-600" />
                <span>Year-End Process</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="schoolYear">School Year</Label>
                <Input
                  id="schoolYear"
                  placeholder="e.g., 2024-2025"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  disabled={!isWithinAllowedWindow()}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter the school year to archive (e.g., 2024-2025)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">What this does:</p>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• Archives all current submissions and stats by user</li>
                      <li>• Saves monthly data and requirement status</li>
                      <li>• Wipes all current submissions for fresh start</li>
                      <li>• Resets profile completion status</li>
                      <li>• Preserves user profiles and admin roles</li>
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
                    {archiveYearMutation.isPending || wipeDatabaseMutation.isPending 
                      ? 'Processing...' 
                      : 'Archive Year & Wipe Database'
                    }
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span>Confirm Year-End Process</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will archive the current school year ({schoolYear}) and wipe all current submissions. 
                      All user data will be preserved in yearly history. This action cannot be undone.
                      <br /><br />
                      Are you absolutely sure you want to proceed?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleArchiveAndWipe}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Yes, Archive & Wipe
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <span>Production Cleanup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Remove Demo Data</p>
                    <p className="text-sm text-red-700 mt-1">
                      This will permanently remove all demo users, their submissions, and test data. 
                      Run this before deploying to production.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Demo data to be removed:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• demo.student@gmail.com</li>
                  <li>• demouser2@gmail.com</li>
                  <li>• vabhiram20092@gmail.com</li>
                  <li>• All their submissions and assignments</li>
                </ul>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full border-red-200 text-red-600 hover:bg-red-50"
                    disabled={removeDemoDataMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {removeDemoDataMutation.isPending ? 'Removing...' : 'Remove Demo Data'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span>Remove Demo Data</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all demo users and their data. This is typically done 
                      before deploying to production. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => removeDemoDataMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Yes, Remove Demo Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span>Safety Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Time Restrictions</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Database operations only allowed May 1st - August 1st</li>
                  <li>• This prevents accidental mid-year data loss</li>
                  <li>• Demo data removal has no time restrictions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Data Preservation</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• User profiles and admin roles are preserved</li>
                  <li>• Historical data is archived before wiping</li>
                  <li>• Students can view past years in their dashboard</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
