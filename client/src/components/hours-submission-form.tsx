import { useState, useEffect } from "react";
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
import { Upload, X, MapPin, Search, Loader2 } from "lucide-react";

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
  location: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface HoursSubmissionFormProps {
  user: User | null;
  onSuccess: () => void;
  editingSubmission?: HoursSubmission | null;
  clubId?: string;
  logId?: string;
  logName?: string;
  requireProofImage?: boolean;
}

export function HoursSubmissionForm({ user, onSuccess, editingSubmission, clubId, logId, logName, requireProofImage = false }: HoursSubmissionFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editingSubmission?.proofImageUrl || null);
  const [locationSearch, setLocationSearch] = useState(editingSubmission?.location || "");
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(
    editingSubmission?.latitude && editingSubmission?.longitude
      ? { lat: editingSubmission.latitude, lng: editingSubmission.longitude, name: editingSubmission.location || "" }
      : null
  );
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activityName: editingSubmission?.activityName || "",
      description: editingSubmission?.description || "",
      date: editingSubmission?.date ? editingSubmission.date.split('T')[0] : "",
      hours: editingSubmission?.hours ? editingSubmission.hours.toString() : "",
      location: editingSubmission?.location || "",
    },
  });

  useEffect(() => {
    const searchLocation = async () => {
      if (locationSearch.length < 3) {
        setLocationResults([]);
        return;
      }
      setIsSearchingLocation(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=5`
        );
        const data = await response.json();
        setLocationResults(data);
      } catch (error) {
        console.error('Location search failed:', error);
      } finally {
        setIsSearchingLocation(false);
      }
    };
    
    const timeoutId = setTimeout(searchLocation, 300);
    return () => clearTimeout(timeoutId);
  }, [locationSearch]);

  const handleLocationSelect = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name.split(',').slice(0, 2).join(',');
    setSelectedLocation({ lat, lng, name });
    setLocationSearch(name);
    form.setValue('location', name);
    setLocationResults([]);
  };

  const clearLocation = () => {
    setSelectedLocation(null);
    setLocationSearch("");
    form.setValue('location', "");
  };

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
        const updateData: any = {
          activityName: data.activityName,
          description: data.description,
          date: new Date(data.date).toISOString(),
          hours: parseFloat(data.hours),
          status: 'pending',
        };
        if (proofImageUrl !== undefined) updateData.proofImageUrl = proofImageUrl;
        if (selectedLocation) {
          updateData.latitude = selectedLocation.lat;
          updateData.longitude = selectedLocation.lng;
          updateData.location = selectedLocation.name;
        }
        await updateSubmission(editingSubmission.id, updateData);
      } else {
        const submissionData: any = {
          clubId: clubId || '',
          userEmail: user?.email || '',
          userName: user?.name || '',
          hours: parseFloat(data.hours),
          description: data.description,
          activityName: data.activityName,
          date: new Date(data.date).toISOString(),
          createdAt: now,
        };
        if (proofImageUrl) submissionData.proofImageUrl = proofImageUrl;
        if (selectedLocation) {
          submissionData.latitude = selectedLocation.lat;
          submissionData.longitude = selectedLocation.lng;
          submissionData.location = selectedLocation.name;
        }
        if (logId) submissionData.logId = logId;
        if (logName) submissionData.logName = logName;
        await createSubmission(submissionData);
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
      setSelectedLocation(null);
      setLocationSearch("");
      // Invalidate queries with proper cache key structure including clubId
      queryClient.invalidateQueries({ queryKey: ['firebase-user-submissions', user?.email, clubId] });
      queryClient.invalidateQueries({ queryKey: ['firebase-club-submissions'] });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Form submission error:", error);
      const errorMessage = error?.message || error?.code || (typeof error === 'string' ? error : 'Unknown error');
      toast({
        title: "Error",
        description: editingSubmission 
          ? `Failed to update hours: ${errorMessage}` 
          : `Failed to submit hours: ${errorMessage}`,
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
    if (requireProofImage && !selectedFile && !imagePreview) {
      toast({
        title: "Proof image required",
        description: "Please upload an image as proof of your service hours",
        variant: "destructive",
      });
      return;
    }
    console.log("Hours form submitting with data:", data);
    submitMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.error("Hours form validation errors:", errors))} className="space-y-4 lg:space-y-6">
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

      <div className="relative">
        <Label className="text-gray-700 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Service Location (Optional)
        </Label>
        <p className="text-sm text-gray-500 mb-2">
          Adding a location helps grow your club's territory on the map
        </p>
        {selectedLocation ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-green-700 flex-1">{selectedLocation.name}</span>
            <button
              type="button"
              onClick={clearLocation}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search for a location..."
              className="pl-10 bg-white border-gray-200 text-gray-900"
            />
            {isSearchingLocation && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
            {locationResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {locationResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleLocationSelect(result)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
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
        <Label className="text-gray-700">Proof of Service {requireProofImage ? '(Required)' : '(Optional)'}</Label>
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
            setSelectedLocation(null);
            setLocationSearch("");
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
