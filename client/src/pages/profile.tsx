import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { User, getCurrentUser } from "@/lib/firebase";
import { insertUserProfileSchema, insertProjectSchema, type Project, type UserProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserIcon, Save, Loader2, Plus, Edit, Trash2, Briefcase } from "lucide-react";

const profileSchema = insertUserProfileSchema.extend({
  goByFirstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  studentId: z.string().min(1, "Student ID is required"),
  personalEmailAddress: z.string().email("Valid email is required").min(1, "Email is required"),
  cellPhoneNumber: z.string().min(1, "Cell phone number is required"),
  gradeLevel: z.string().min(1, "Grade level is required"),
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

  const { data: profile, isLoading } = useQuery<UserProfile>({
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
        isProfileComplete: true,
      };
      console.log('Making API call with payload:', payload);
      const response = await apiRequest('PUT', '/api/user-profile', payload);
      console.log('API response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Profile update successful:', data);
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
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ProfileData) => {
    console.log('Form submitted with data:', data);
    console.log('Form errors:', form.formState.errors);
    console.log('Form is valid:', form.formState.isValid);
    
    if (Object.keys(form.formState.errors).length > 0) {
      console.log('Form has validation errors, not submitting');
      return;
    }
    
    console.log('Calling updateProfileMutation.mutate with:', data);
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-white min-h-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
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
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <p className="text-sm text-gray-600">
              Please use a personal email account that you can receive mail at.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              console.log('Form onSubmit triggered');
              form.handleSubmit(onSubmit)(e);
            }} className="space-y-6"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="goByFirstName">Go-By First Name *</Label>
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
                  <Label htmlFor="lastName">Last Name *</Label>
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
                  <Label htmlFor="studentId">Student ID *</Label>
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
                <Label htmlFor="personalEmailAddress">Personal Email Address *</Label>
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
                <Label htmlFor="cellPhoneNumber">Cell Phone Number *</Label>
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
                <Label htmlFor="gradeLevel">Grade Level *</Label>
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
                  onClick={(e) => {
                    console.log('Button clicked');
                    console.log('Current form values:', form.getValues());
                    console.log('Form state:', form.formState);
                    e.preventDefault();
                    const formData = form.getValues();
                    console.log('Manual form submission with data:', formData);
                    onSubmit(formData);
                  }}
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

        {/* Projects Section */}
        <ProjectsSection user={user} />
      </div>
    </div>
  );
}

// Projects Section Component
function ProjectsSection({ user }: { user: User | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);

  const emailToKey = (email: string) => email.replace(/\./g, ',');
  const userId = user?.email ? emailToKey(user.email) : '';

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: [`/api/projects/${userId}`],
    enabled: !!user?.email,
  });

  const projectSchema = insertProjectSchema.extend({
    projectName: z.string().min(1, "Project name is required"),
    role: z.string().min(1, "Role is required"),
    completionDate: z.string().min(1, "Completion date is required"),
  });

  const projectForm = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectName: "",
      role: "",
      completionDate: "",
      description: "",
      imageUrl: "",
    },
  });

  useEffect(() => {
    if (editingProject) {
      projectForm.reset({
        projectName: editingProject.projectName,
        role: editingProject.role,
        completionDate: editingProject.completionDate,
        description: editingProject.description || "",
        imageUrl: editingProject.imageUrl || "",
      });
    }
  }, [editingProject, projectForm]);

  const createProjectMutation = useMutation({
    mutationFn: async (data: z.infer<typeof projectSchema>) => {
      return await apiRequest('POST', '/api/projects', {
        ...data,
        userId: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${userId}`] });
      toast({
        title: "Success",
        description: "Project added successfully",
      });
      setIsAddDialogOpen(false);
      projectForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add project",
        variant: "destructive",
      });
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof projectSchema> }) => {
      return await apiRequest('PUT', `/api/projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${userId}`] });
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      setEditingProject(null);
      projectForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/projects/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${userId}`] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      setDeletingProjectId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  });

  const onSubmitProject = (data: z.infer<typeof projectSchema>) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    } else {
      createProjectMutation.mutate(data);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
              Projects & Experience
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Showcase your projects and accomplishments
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-add-project">
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={projectForm.handleSubmit(onSubmitProject)} className="space-y-4">
                <div>
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    {...projectForm.register("projectName")}
                    placeholder="e.g., KAV Timer"
                    data-testid="input-project-name"
                  />
                  {projectForm.formState.errors.projectName && (
                    <p className="text-sm text-red-600 mt-1">{projectForm.formState.errors.projectName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="role">Your Role *</Label>
                  <Input
                    id="role"
                    {...projectForm.register("role")}
                    placeholder="e.g., Co-Developer"
                    data-testid="input-role"
                  />
                  {projectForm.formState.errors.role && (
                    <p className="text-sm text-red-600 mt-1">{projectForm.formState.errors.role.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="completionDate">Completion Date *</Label>
                  <Input
                    id="completionDate"
                    {...projectForm.register("completionDate")}
                    placeholder="e.g., December 2024"
                    data-testid="input-completion-date"
                  />
                  {projectForm.formState.errors.completionDate && (
                    <p className="text-sm text-red-600 mt-1">{projectForm.formState.errors.completionDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...projectForm.register("description")}
                    placeholder="Brief description of the project..."
                    rows={3}
                    data-testid="input-description"
                  />
                </div>

                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    {...projectForm.register("imageUrl")}
                    placeholder="https://example.com/project-image.jpg"
                    data-testid="input-image-url"
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsAddDialogOpen(false);
                    projectForm.reset();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createProjectMutation.isPending} data-testid="button-save-project">
                    {createProjectMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Add Project
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Project Dialog */}
          <Dialog open={!!editingProject} onOpenChange={(open) => {
            if (!open) {
              setEditingProject(null);
              projectForm.reset();
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={projectForm.handleSubmit(onSubmitProject)} className="space-y-4">
                <div>
                  <Label htmlFor="edit-projectName">Project Name *</Label>
                  <Input
                    id="edit-projectName"
                    {...projectForm.register("projectName")}
                    placeholder="e.g., KAV Timer"
                  />
                  {projectForm.formState.errors.projectName && (
                    <p className="text-sm text-red-600 mt-1">{projectForm.formState.errors.projectName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-role">Your Role *</Label>
                  <Input
                    id="edit-role"
                    {...projectForm.register("role")}
                    placeholder="e.g., Co-Developer"
                  />
                  {projectForm.formState.errors.role && (
                    <p className="text-sm text-red-600 mt-1">{projectForm.formState.errors.role.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-completionDate">Completion Date *</Label>
                  <Input
                    id="edit-completionDate"
                    {...projectForm.register("completionDate")}
                    placeholder="e.g., December 2024"
                  />
                  {projectForm.formState.errors.completionDate && (
                    <p className="text-sm text-red-600 mt-1">{projectForm.formState.errors.completionDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    {...projectForm.register("description")}
                    placeholder="Brief description of the project..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-imageUrl">Image URL</Label>
                  <Input
                    id="edit-imageUrl"
                    {...projectForm.register("imageUrl")}
                    placeholder="https://example.com/project-image.jpg"
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setEditingProject(null);
                    projectForm.reset();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateProjectMutation.isPending}>
                    {updateProjectMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Project
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deletingProjectId !== null} onOpenChange={(open) => {
            if (!open) setDeletingProjectId(null);
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Project</DialogTitle>
              </DialogHeader>
              <p className="text-gray-600">
                Are you sure you want to delete this project? This action cannot be undone.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeletingProjectId(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (deletingProjectId !== null) {
                      deleteProjectMutation.mutate(deletingProjectId);
                    }
                  }}
                  disabled={deleteProjectMutation.isPending}
                >
                  {deleteProjectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-4">Start showcasing your work by adding your first project</p>
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-add-first-project"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  {project.imageUrl && (
                    <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
                      <img 
                        src={project.imageUrl} 
                        alt={project.projectName}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900" data-testid={`text-project-name-${project.id}`}>
                        {project.projectName}
                      </h3>
                      <p className="text-sm text-blue-600 font-medium" data-testid={`text-project-role-${project.id}`}>
                        {project.role}
                      </p>
                      <p className="text-sm text-gray-500 mt-1" data-testid={`text-project-date-${project.id}`}>
                        {project.completionDate}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingProject(project)}
                        data-testid={`button-edit-project-${project.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingProjectId(project.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-project-${project.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-sm text-gray-700 mt-3 leading-relaxed" data-testid={`text-project-description-${project.id}`}>
                      {project.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}