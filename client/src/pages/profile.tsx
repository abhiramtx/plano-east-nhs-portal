import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { User, getCurrentUser } from "@/lib/firebase";
import { insertUserProfileSchema, type UserProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserIcon, Save, Loader2, QrCode } from "lucide-react";
import QRCode from "react-qr-code";

interface CustomField {
  id: string;
  clubId: string;
  fieldName: string;
  description?: string;
  fieldType: "text" | "checkbox" | "select" | "number" | "email" | "phone";
  required: boolean;
  filterable: boolean;
  selectOptions?: string;
  defaultValue?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomFieldValue {
  id: string;
  userId: string;
  customFieldId: string;
  clubId: string;
  value?: string;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = insertUserProfileSchema.extend({
  goByFirstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  studentId: z.string().min(1, "Student ID is required"),
  personalEmailAddress: z.string().email("Valid email is required").min(1, "Email is required"),
  cellPhoneNumber: z.string().min(1, "Cell phone number is required"),
  gradeLevel: z.string().min(1, "Grade level is required"),
});

type ProfileData = z.infer<typeof profileSchema>;

const emailToKey = (email: string) => email.replace(/\./g, ',');

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/user-profile', user?.email ? emailToKey(user.email) : ''],
    enabled: !!user?.email,
  });

  const { data: customFields = [], isLoading: customFieldsLoading } = useQuery<CustomField[]>({
    queryKey: ['/api/custom-fields', profile?.clubId],
    enabled: !!profile?.clubId,
    queryFn: async () => {
      const response = await fetch(`/api/custom-fields/${profile?.clubId}`, { credentials: "include" });
      if (!response.ok) throw new Error('Failed to fetch custom fields');
      return response.json() as Promise<CustomField[]>;
    }
  });

  const { data: fieldValues = [] } = useQuery<CustomFieldValue[]>({
    queryKey: ['/api/custom-field-values', user?.email, profile?.clubId],
    enabled: !!user?.email && !!profile?.clubId,
    queryFn: async () => {
      const userId = user?.email ? emailToKey(user.email) : '';
      const response = await fetch(`/api/custom-field-values/${userId}/${profile?.clubId}`, { credentials: "include" });
      if (!response.ok) throw new Error('Failed to fetch custom field values');
      return response.json() as Promise<CustomFieldValue[]>;
    }
  });

  useEffect(() => {
    if (fieldValues) {
      const values: { [key: string]: string } = {};
      fieldValues.forEach((fv: CustomFieldValue) => {
        values[fv.customFieldId] = fv.value || '';
      });
      setCustomFieldValues(values);
    }
  }, [fieldValues]);

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
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const payload = {
        ...data,
        userId: user?.email ? emailToKey(user.email) : '',
        isProfileComplete: true,
      };
      const response = await apiRequest('PUT', '/api/user-profile', payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-profile', user?.email ? emailToKey(user.email) : ''] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateCustomFieldValueMutation = useMutation({
    mutationFn: async ({ fieldId, value }: { fieldId: string; value: string }) => {
      const userId = user?.email ? emailToKey(user.email) : '';
      const payload = {
        clubId: profile?.clubId,
        value,
      };
      const response = await apiRequest('PUT', `/api/custom-field-values/${userId}/${fieldId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-field-values', user?.email, profile?.clubId] });
      toast({
        title: "Success",
        description: "Custom field updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update custom field",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ProfileData) => {
    if (Object.keys(form.formState.errors).length > 0) {
      return;
    }
    updateProfileMutation.mutate(data);
  };

  const renderFieldLabel = (field: CustomField) => (
    <div className="flex-shrink-0 w-48">
      <Label htmlFor={field.id} className="text-gray-700">
        {field.fieldName}
        {field.required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      {field.description && (
        <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>
      )}
    </div>
  );

  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.id] || field.defaultValue || '';
    const isLoading = updateCustomFieldValueMutation.isPending;

    switch (field.fieldType) {
      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center gap-4">
            {renderFieldLabel(field)}
            <Checkbox
              id={field.id}
              checked={value === 'true' || value === true}
              onCheckedChange={(checked) => {
                setCustomFieldValues({ ...customFieldValues, [field.id]: checked ? 'true' : 'false' });
                updateCustomFieldValueMutation.mutate({ fieldId: field.id, value: checked ? 'true' : 'false' });
              }}
              disabled={isLoading}
            />
          </div>
        );

      case 'select':
        const options = field.selectOptions ? JSON.parse(field.selectOptions) : [];
        return (
          <div key={field.id} className="flex items-center gap-4">
            {renderFieldLabel(field)}
            <div className="flex-1">
              <Select
                value={value}
                onValueChange={(newValue) => {
                  setCustomFieldValues({ ...customFieldValues, [field.id]: newValue });
                  updateCustomFieldValueMutation.mutate({ fieldId: field.id, value: newValue });
                }}
              >
                <SelectTrigger id={field.id} className="bg-white border-gray-200 text-gray-900" disabled={isLoading}>
                  <SelectValue placeholder={`Select ${field.fieldName.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {options.map((option: string) => (
                    <SelectItem key={option} value={option} className="text-gray-900 hover:bg-gray-100">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'email':
        return (
          <div key={field.id} className="flex items-center gap-4">
            {renderFieldLabel(field)}
            <Input
              id={field.id}
              type="email"
              value={value}
              onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
              onBlur={() => {
                updateCustomFieldValueMutation.mutate({ fieldId: field.id, value });
              }}
              placeholder={`Enter ${field.fieldName.toLowerCase()}`}
              className="flex-1 bg-white border-gray-200 text-gray-900"
              disabled={isLoading}
            />
          </div>
        );

      case 'phone':
        return (
          <div key={field.id} className="flex items-center gap-4">
            {renderFieldLabel(field)}
            <Input
              id={field.id}
              type="tel"
              value={value}
              onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
              onBlur={() => {
                updateCustomFieldValueMutation.mutate({ fieldId: field.id, value });
              }}
              placeholder={`Enter ${field.fieldName.toLowerCase()}`}
              className="flex-1 bg-white border-gray-200 text-gray-900"
              disabled={isLoading}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="flex items-center gap-4">
            {renderFieldLabel(field)}
            <Input
              id={field.id}
              type="number"
              value={value}
              onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
              onBlur={() => {
                updateCustomFieldValueMutation.mutate({ fieldId: field.id, value });
              }}
              placeholder={`Enter ${field.fieldName.toLowerCase()}`}
              className="flex-1 bg-white border-gray-200 text-gray-900"
              disabled={isLoading}
            />
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.id} className="flex items-center gap-4">
            {renderFieldLabel(field)}
            <Input
              id={field.id}
              type="text"
              value={value}
              onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
              onBlur={() => {
                updateCustomFieldValueMutation.mutate({ fieldId: field.id, value });
              }}
              placeholder={`Enter ${field.fieldName.toLowerCase()}`}
              className="flex-1 bg-white border-gray-200 text-gray-900"
              disabled={isLoading}
            />
          </div>
        );
    }
  };

  const isLoading = profileLoading || customFieldsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-white min-h-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6 pt-16 lg:pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Profile</h1>
              <p className="text-gray-600 mt-1">Manage your personal information</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-black rounded-lg">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <Card className="bg-white border-gray-200 mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900">Personal Information</CardTitle>
            <p className="text-sm text-gray-500">
              Please use a personal email account that you can receive mail at.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)(e);
            }} className="space-y-6"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="goByFirstName" className="text-gray-700">Go-By First Name *</Label>
                  <Input
                    id="goByFirstName"
                    {...form.register("goByFirstName")}
                    placeholder="e.g., John"
                    className="mt-1 bg-white border-gray-200 text-gray-900"
                  />
                  {form.formState.errors.goByFirstName && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.goByFirstName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName" className="text-gray-700">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...form.register("lastName")}
                    placeholder="e.g., Smith"
                    className="mt-1 bg-white border-gray-200 text-gray-900"
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.lastName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="studentId" className="text-gray-700">Student ID *</Label>
                  <Input
                    id="studentId"
                    {...form.register("studentId")}
                    placeholder="Enter your student ID"
                    className="mt-1 bg-white border-gray-200 text-gray-900"
                  />
                  {form.formState.errors.studentId && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.studentId.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="personalEmailAddress" className="text-gray-700">Personal Email Address *</Label>
                <Input
                  id="personalEmailAddress"
                  type="email"
                  {...form.register("personalEmailAddress")}
                  placeholder="your.email@example.com"
                  className="mt-1 bg-white border-gray-200 text-gray-900"
                />
                {form.formState.errors.personalEmailAddress && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.personalEmailAddress.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cellPhoneNumber" className="text-gray-700">Cell Phone Number *</Label>
                <Input
                  id="cellPhoneNumber"
                  type="tel"
                  {...form.register("cellPhoneNumber")}
                  placeholder="(555) 123-4567"
                  className="mt-1 bg-white border-gray-200 text-gray-900"
                />
                {form.formState.errors.cellPhoneNumber && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.cellPhoneNumber.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gradeLevel" className="text-gray-700">Grade Level *</Label>
                <Select
                  value={form.watch("gradeLevel")}
                  onValueChange={(value) => form.setValue("gradeLevel", value)}
                >
                  <SelectTrigger className="mt-1 bg-white border-gray-200 text-gray-900">
                    <SelectValue placeholder="Select your grade level" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="9" className="text-gray-900 hover:bg-gray-100">9th Grade</SelectItem>
                    <SelectItem value="10" className="text-gray-900 hover:bg-gray-100">10th Grade</SelectItem>
                    <SelectItem value="11" className="text-gray-900 hover:bg-gray-100">11th Grade</SelectItem>
                    <SelectItem value="12" className="text-gray-900 hover:bg-gray-100">12th Grade</SelectItem>
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
                  className="bg-black hover:bg-gray-800 text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    const formData = form.getValues();
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

        {customFields.length > 0 && (
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customFields.map(renderCustomField)}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-gray-700" />
              <CardTitle className="text-gray-900">Your QR Code</CardTitle>
            </div>
            <p className="text-sm text-gray-500">
              Show this to your club admin when attending Scan QR events. Your email is encoded so you can be checked in and out automatically.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-6">
            <div className="p-4 bg-white border-2 border-gray-200 rounded-xl inline-block">
              <QRCode value={user.email} size={180} />
            </div>
            <p className="text-xs text-gray-400 font-mono">{user.email}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
