import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Club } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit2,
  Save
} from "lucide-react";

interface AdminCustomFieldsProps {
  user: User | null;
  club: Club;
}

interface CustomField {
  id: string;
  clubId: string;
  fieldName: string;
  description?: string;
  fieldType: "text" | "checkbox" | "select" | "number" | "email" | "phone" | "multiselect";
  required: boolean;
  filterable: boolean;
  selectOptions?: string;
  defaultValue?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export function AdminCustomFields({ user, club }: AdminCustomFieldsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fieldName: "",
    description: "",
    fieldType: "text" as "text" | "checkbox" | "select" | "number" | "email" | "phone" | "multiselect",
    required: false,
    filterable: false,
    selectOptions: "",
    defaultValue: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fields = [], isLoading } = useQuery<CustomField[]>({
    queryKey: ['/api/custom-fields', club.id],
    queryFn: async () => {
      const response = await fetch(`/api/custom-fields/${club.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error('Failed to fetch custom fields');
      return response.json() as Promise<CustomField[]>;
    },
  });

  const createFieldMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        clubId: club.id,
        order: fields.length,
        selectOptions: data.selectOptions ? JSON.stringify(data.selectOptions.split(',').map((s: string) => s.trim())) : undefined,
      };
      const response = await apiRequest('POST', '/api/custom-fields', payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-fields', club.id] });
      toast({
        title: "Success",
        description: "Custom field created successfully",
      });
      setFormData({
        fieldName: "",
        description: "",
        fieldType: "text",
        required: false,
        filterable: false,
        selectOptions: "",
        defaultValue: "",
      });
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create custom field",
        variant: "destructive",
      });
    }
  });

  const updateFieldMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        selectOptions: data.selectOptions ? JSON.stringify(data.selectOptions.split(',').map((s: string) => s.trim())) : undefined,
      };
      const response = await apiRequest('PUT', `/api/custom-fields/${data.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-fields', club.id] });
      toast({
        title: "Success",
        description: "Custom field updated successfully",
      });
      setIsEditingId(null);
      setFormData({
        fieldName: "",
        fieldType: "text",
        required: false,
        filterable: false,
        selectOptions: "",
        defaultValue: "",
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

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      await apiRequest('DELETE', `/api/custom-fields/${fieldId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-fields', club.id] });
      toast({
        title: "Success",
        description: "Custom field deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete custom field",
        variant: "destructive",
      });
    }
  });

  const handleAdd = () => {
    if (!formData.fieldName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a field name",
        variant: "destructive",
      });
      return;
    }
    
      if ((formData.fieldType === 'select' || formData.fieldType === 'multiselect') && !formData.selectOptions.trim()) {
      toast({
        title: "Error",
        description: "Please enter select options (comma-separated)",
        variant: "destructive",
      });
      return;
    }

    createFieldMutation.mutate(formData);
  };

  const handleUpdate = (field: CustomField) => {
    if (!formData.fieldName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a field name",
        variant: "destructive",
      });
      return;
    }

    updateFieldMutation.mutate({
      id: field.id,
      ...formData,
    });
  };

  const startEdit = (field: CustomField) => {
    setFormData({
      fieldName: field.fieldName,
      description: field.description || "",
      fieldType: field.fieldType,
      required: field.required,
      filterable: field.filterable,
      selectOptions: field.selectOptions ? JSON.parse(field.selectOptions).join(', ') : "",
      defaultValue: field.defaultValue || "",
    });
    setIsEditingId(field.id);
  };

  const cancelEdit = () => {
    setIsEditingId(null);
    setFormData({
      fieldName: "",
      description: "",
      fieldType: "text",
      required: false,
      filterable: false,
      selectOptions: "",
      defaultValue: "",
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-background min-h-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const editingField = isEditingId ? fields.find((f: CustomField) => f.id === isEditingId) : null;

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      <div className="bg-card border-b border-border flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-destructive">
              <Settings className="w-7 h-7 text-destructive-foreground" />
            </div>
            <div>
              <h1 className="page-title text-xl lg:text-2xl font-bold text-foreground">Custom Fields</h1>
              <p className="text-muted-foreground mt-0.5">Create fields that appear on volunteer profiles</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="mb-6">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/85 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Custom Field</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fieldName" className="text-foreground">Field Name</Label>
                  <Input
                    id="fieldName"
                    placeholder="e.g., Preferred Location"
                    value={formData.fieldName}
                    onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-foreground">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Brief description shown to volunteers"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="fieldType" className="text-foreground">Field Type</Label>
                  <Select value={formData.fieldType} onValueChange={(value: any) => setFormData({ ...formData, fieldType: value })}>
                    <SelectTrigger id="fieldType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                      <SelectItem value="select">Select (Dropdown)</SelectItem>
                      <SelectItem value="multiselect">Multi-Select (Checkboxes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.fieldType === 'select' || formData.fieldType === 'multiselect') && (
                  <div>
                    <Label htmlFor="selectOptions" className="text-foreground">Options (comma-separated)</Label>
                    <Textarea
                      id="selectOptions"
                      placeholder="Option 1, Option 2, Option 3"
                      value={formData.selectOptions}
                      onChange={(e) => setFormData({ ...formData, selectOptions: e.target.value })}
                      rows={3}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="defaultValue" className="text-foreground">Default Value (Optional)</Label>
                  <Input
                    id="defaultValue"
                    placeholder="Leave empty for no default"
                    value={formData.defaultValue}
                    onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="required"
                      checked={formData.required}
                      onCheckedChange={(checked) => setFormData({ ...formData, required: checked as boolean })}
                    />
                    <Label htmlFor="required" className="font-normal cursor-pointer">
                      Required field
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filterable"
                      checked={formData.filterable}
                      onCheckedChange={(checked) => setFormData({ ...formData, filterable: checked as boolean })}
                    />
                    <Label htmlFor="filterable" className="font-normal cursor-pointer">
                      Make this field filterable in admin
                    </Label>
                  </div>
                </div>

                <Button
                  onClick={handleAdd}
                  disabled={createFieldMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/85 text-primary-foreground"
                >
                  {createFieldMutation.isPending ? "Creating..." : "Create Field"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {fields.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Settings className="w-16 h-16 mx-auto mb-4 text-muted-foreground/60" />
              <h3 className="text-lg font-medium text-foreground mb-2">No custom fields yet</h3>
              <p className="text-muted-foreground">Create your first custom field to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {fields.map((field: CustomField) => (
              <Card key={field.id}>
                <CardContent className="p-4">
                  {isEditingId === field.id ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`edit-fieldName-${field.id}`} className="text-foreground">Field Name</Label>
                        <Input
                          id={`edit-fieldName-${field.id}`}
                          placeholder="e.g., Preferred Location"
                          value={formData.fieldName}
                          onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`edit-description-${field.id}`} className="text-foreground">Description (Optional)</Label>
                        <Input
                          id={`edit-description-${field.id}`}
                          placeholder="Brief description shown to volunteers"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`edit-fieldType-${field.id}`} className="text-foreground">Field Type</Label>
                        <Select value={formData.fieldType} onValueChange={(value: any) => setFormData({ ...formData, fieldType: value })}>
                          <SelectTrigger id={`edit-fieldType-${field.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[200]">
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                            <SelectItem value="select">Select (Dropdown)</SelectItem>
                            <SelectItem value="multiselect">Multi-Select (Checkboxes)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(formData.fieldType === 'select' || formData.fieldType === 'multiselect') && (
                        <div>
                          <Label htmlFor={`edit-selectOptions-${field.id}`} className="text-foreground">Options (comma-separated)</Label>
                          <Textarea
                            id={`edit-selectOptions-${field.id}`}
                            placeholder="Option 1, Option 2, Option 3"
                            value={formData.selectOptions}
                            onChange={(e) => setFormData({ ...formData, selectOptions: e.target.value })}
                            rows={3}
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor={`edit-defaultValue-${field.id}`} className="text-foreground">Default Value (Optional)</Label>
                        <Input
                          id={`edit-defaultValue-${field.id}`}
                          placeholder="Leave empty for no default"
                          value={formData.defaultValue}
                          onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-required-${field.id}`}
                            checked={formData.required}
                            onCheckedChange={(checked) => setFormData({ ...formData, required: checked as boolean })}
                          />
                          <Label htmlFor={`edit-required-${field.id}`} className="font-normal cursor-pointer">
                            Required field
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-filterable-${field.id}`}
                            checked={formData.filterable}
                            onCheckedChange={(checked) => setFormData({ ...formData, filterable: checked as boolean })}
                          />
                          <Label htmlFor={`edit-filterable-${field.id}`} className="font-normal cursor-pointer">
                            Make this field filterable in admin
                          </Label>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdate(field)}
                          disabled={updateFieldMutation.isPending}
                          className="flex-1 bg-chart-3 hover:bg-chart-3/85 text-primary-foreground"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {updateFieldMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          onClick={cancelEdit}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-foreground">{field.fieldName}</h3>
                        {field.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{field.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-block px-2 py-1 text-sm rounded-full bg-primary/15 text-primary border border-primary/30">
                            {field.fieldType}
                          </span>
                          {field.required && (
                            <span className="inline-block px-2 py-1 text-sm rounded-full bg-destructive/15 text-destructive border border-destructive/30">
                              Required
                            </span>
                          )}
                          {field.filterable && (
                            <span className="inline-block px-2 py-1 text-sm rounded-full bg-chart-5/15 text-chart-5 border border-chart-5/30">
                              Filterable
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(field)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteFieldMutation.mutate(field.id)}
                          disabled={deleteFieldMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
