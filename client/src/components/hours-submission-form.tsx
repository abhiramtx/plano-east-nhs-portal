import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { User, HoursSubmission, createSubmission, updateSubmission } from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      const maxSize = 400;
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        const compressedFile = new File([blob!], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        resolve(compressedFile);
      }, 'image/jpeg', 0.6);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

const formSchema = z.object({
  activityName: z.string().min(1, "Activity name is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  hours: z.string().min(1, "Hours is required"),
});

type FormData = z.infer<typeof formSchema>;

interface HoursSubmissionFormProps {
  user: User | null;
  onSuccess: () => void;
  editingSubmission?: HoursSubmission | null;
  clubId?: string;
}

export function HoursSubmissionForm({ user, onSuccess, editingSubmission, clubId }: HoursSubmissionFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editingSubmission?.proofImageUrl || null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activityName: editingSubmission?.activityName || "",
      description: editingSubmission?.description || "",
      date: editingSubmission?.date ? editingSubmission.date.split('T')[0] : "",
      hours: editingSubmission?.hours ? editingSubmission.hours.toString() : "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      let proofImageUrl = editingSubmission?.proofImageUrl;
      if (selectedFile) {
        const compressedFile = await compressImage(selectedFile);
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
        });
        reader.readAsDataURL(compressedFile);
        proofImageUrl = await base64Promise;
      }

      const now = new Date().toISOString();

      if (editingSubmission) {
        await updateSubmission(editingSubmission.id, {
          activityName: data.activityName,
          description: data.description,
          date: new Date(data.date).toISOString(),
          hours: parseFloat(data.hours),
          proofImageUrl: proofImageUrl,
          status: 'pending',
        });
      } else {
        await createSubmission({
          clubId: clubId || '',
          userEmail: user?.email || '',
          userName: user?.name || '',
          hours: parseFloat(data.hours),
          description: data.description,
          activityName: data.activityName,
          date: new Date(data.date).toISOString(),
          proofImageUrl: proofImageUrl,
          createdAt: now,
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingSubmission ? "Hours submission updated successfully" : "Hours submission created successfully",
      });
      form.reset();
      setSelectedFile(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['firebase-user-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-club-submissions'] });
      onSuccess();
    },
    onError: (error) => {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: editingSubmission ? "Failed to update hours" : "Failed to submit hours",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPG or PNG image",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 1 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 1MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
  };

  const onSubmit = (data: FormData) => {
    submitMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 lg:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <div>
          <Label htmlFor="activityName" className="text-gray-700">Activity Name</Label>
          <Input
            id="activityName"
            {...form.register("activityName")}
            placeholder="Enter the activity name"
            className="mt-1 bg-white border-gray-200 text-gray-900"
          />
          {form.formState.errors.activityName && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.activityName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="hours" className="text-gray-700">Number of Hours</Label>
          <Input
            id="hours"
            type="number"
            step="0.5"
            min="0"
            {...form.register("hours")}
            placeholder="e.g., 2.5"
            className="mt-1 bg-white border-gray-200 text-gray-900"
          />
          {form.formState.errors.hours && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.hours.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="date" className="text-gray-700">Date of Service</Label>
        <Input
          id="date"
          type="date"
          {...form.register("date")}
          className="mt-1 bg-white border-gray-200 text-gray-900"
        />
        {form.formState.errors.date && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.date.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description" className="text-gray-700">Description of Service</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Describe what you did during your service hours..."
          className="mt-1 bg-white border-gray-200 text-gray-900"
          rows={4}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div>
        <Label className="text-gray-700">Proof of Service (Optional)</Label>
        <p className="text-sm text-gray-500 mb-3">
          Upload a photo as proof of your service (JPG or PNG, max 1MB)
        </p>
        
        {!selectedFile && !imagePreview ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to upload an image</span>
            </label>
          </div>
        ) : (
          <div className="relative">
            <img
              src={imagePreview || ''}
              alt="Preview"
              className="max-w-full h-48 object-cover rounded-lg border border-gray-200"
            />
            <button
              type="button"
              onClick={removeFile}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {selectedFile && (
              <p className="text-sm text-gray-500 mt-2">{selectedFile.name}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          className="border-gray-200 text-gray-600 hover:bg-gray-100"
          onClick={() => {
            form.reset();
            setSelectedFile(null);
            setImagePreview(null);
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitMutation.isPending}
          className="bg-black hover:bg-gray-800 text-white"
        >
          {submitMutation.isPending ? 'Submitting...' : 'Submit Hours'}
        </Button>
      </div>
    </form>
  );
}
