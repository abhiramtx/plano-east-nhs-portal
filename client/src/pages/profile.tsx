import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { User, getCurrentUser } from "@/lib/firebase";
import { insertUserProfileSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserIcon, Save, Loader2 } from "lucide-react";

const profileSchema = insertUserProfileSchema.extend({
  goByFirstName: z.string().optional(),
  lastName: z.string().optional(),
  studentId: z.string().optional(),
  personalEmailAddress: z.string().email().optional().or(z.literal("")),
  cellPhoneNumber: z.string().optional(),
  gradeLevel: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

// Helper function to convert email to storage key
const emailToKey = (email: string) => email.replace(/\./g, ',');

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/user-profile', user?.email ? emailToKey(user.email) : ''],
    enabled: !!user?.email,
  });

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      goByFirstName: "",
      lastName: "",
      studentId: "",
      personalEmailAddress: "",
      cellPhoneNumber: "",
      gradeLevel: "",
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        goByFirstName: profile.goByFirstName || "",
        lastName: profile.lastName || "",
        studentId: profile.studentId || "",
        personalEmailAddress: profile.personalEmailAddress || "",
        cellPhoneNumber: profile.cellPhoneNumber || "",
        gradeLevel: profile.gradeLevel || "",
      });
    }
  }, [profile, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const payload = {
        ...data,
        userId: user?.email ? emailToKey(user.email) : '',
      };
      return await apiRequest('PUT', '/api/user-profile', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-profile', user?.email ? emailToKey(user.email) : ''] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ProfileData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 lg:px-6 py-4 lg:py-6 pt-16 lg:pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Profile</h1>
              <p className="text-gray-600 mt-1">Manage your personal information</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <p className="text-sm text-gray-600">
              Please use a personal email account that you can receive mail at.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="goByFirstName">Go-By First Name</Label>
                  <Input
                    id="goByFirstName"
                    {...form.register("goByFirstName")}
                    placeholder="e.g., John"
                    className="mt-1"
                  />
                  {form.formState.errors.goByFirstName && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.goByFirstName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...form.register("lastName")}
                    placeholder="e.g., Smith"
                    className="mt-1"
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.lastName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    {...form.register("studentId")}
                    placeholder="Enter your student ID"
                    className="mt-1"
                  />
                  {form.formState.errors.studentId && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.studentId.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="personalEmailAddress">Personal Email Address</Label>
                <Input
                  id="personalEmailAddress"
                  type="email"
                  {...form.register("personalEmailAddress")}
                  placeholder="your.email@example.com"
                  className="mt-1"
                />
                {form.formState.errors.personalEmailAddress && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.personalEmailAddress.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cellPhoneNumber">Cell Phone Number</Label>
                <Input
                  id="cellPhoneNumber"
                  type="tel"
                  {...form.register("cellPhoneNumber")}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
                {form.formState.errors.cellPhoneNumber && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.cellPhoneNumber.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gradeLevel">Grade Level</Label>
                <Select
                  value={form.watch("gradeLevel")}
                  onValueChange={(value) => form.setValue("gradeLevel", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9">9th Grade</SelectItem>
                    <SelectItem value="10">10th Grade</SelectItem>
                    <SelectItem value="11">11th Grade</SelectItem>
                    <SelectItem value="12">12th Grade</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.gradeLevel && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.gradeLevel.message}</p>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}