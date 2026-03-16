import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  User, HoursSubmission, createSubmission, updateSubmission,
  getClubEvents, getPartnershipEvents, getAllPartnerships, ClubEvent, Partnership
} from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, MapPin, Loader2, Calendar, Building2, Search } from "lucide-react";

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const maxSize = 400;
      let { width, height } = img;
      if (width > height) { if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; } }
      else { if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; } }
      canvas.width = width; canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
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
  onCancel?: () => void;
  editingSubmission?: HoursSubmission | null;
  clubId?: string;
  logId?: string;
  logName?: string;
  requireProofImage?: boolean;
}

export function HoursSubmissionForm({ user, onSuccess, onCancel, editingSubmission, clubId, logId, logName, requireProofImage = false }: HoursSubmissionFormProps) {
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
  const locationInputRef = useRef<HTMLInputElement>(null);

  // New: source / event selection
  const [source, setSource] = useState<'club' | 'partnership'>(
    editingSubmission?.partnershipId ? 'partnership' : 'club'
  );
  const [selectedPartnershipId, setSelectedPartnershipId] = useState(editingSubmission?.partnershipId || '');
  const [selectedEventId, setSelectedEventId] = useState(editingSubmission?.eventId || '');
  const [eventPassword, setEventPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  const { data: clubEvents = [] } = useQuery<ClubEvent[]>({
    queryKey: ['firebase-club-events', clubId],
    queryFn: () => getClubEvents(clubId!),
    enabled: !!clubId && source === 'club',
  });

  const { data: allPartnerships = [] } = useQuery<Partnership[]>({
    queryKey: ['firebase-all-partnerships'],
    queryFn: getAllPartnerships,
    enabled: source === 'partnership',
  });

  const { data: partnershipEvents = [] } = useQuery<ClubEvent[]>({
    queryKey: ['firebase-partnership-events', selectedPartnershipId],
    queryFn: () => getPartnershipEvents(selectedPartnershipId),
    enabled: !!selectedPartnershipId && source === 'partnership',
  });

  const availableEvents = source === 'club' ? clubEvents : partnershipEvents;
  const selectedEvent = availableEvents.find(e => e.id === selectedEventId) || null;
  const selectedPartnership = allPartnerships.find(p => p.id === selectedPartnershipId) || null;

  useEffect(() => {
    const searchLocation = async () => {
      if (locationSearch.length < 3) { setLocationResults([]); return; }
      setIsSearchingLocation(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=5`);
        setLocationResults(await res.json());
      } catch { } finally { setIsSearchingLocation(false); }
    };
    const t = setTimeout(searchLocation, 300);
    return () => clearTimeout(t);
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
      // Validate event password if needed
      if (selectedEvent?.type === 'password' && !editingSubmission) {
        if (eventPassword !== selectedEvent.password) {
          setPasswordError("Incorrect event password");
          throw new Error("Incorrect event password");
        }
      }

      let proofImageUrl = editingSubmission?.proofImageUrl;
      if (selectedFile) {
        const compressed = await compressImage(selectedFile);
        const reader = new FileReader();
        const base64 = new Promise<string>((resolve) => { reader.onloadend = () => resolve(reader.result as string); });
        reader.readAsDataURL(compressed);
        proofImageUrl = await base64;
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
          clubId: source === 'club' ? (clubId || '') : '',
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
        if (selectedEventId) {
          submissionData.eventId = selectedEventId;
          submissionData.eventName = selectedEvent?.name;
        }
        if (source === 'partnership' && selectedPartnershipId) {
          submissionData.partnershipId = selectedPartnershipId;
          submissionData.partnershipName = selectedPartnership?.name;
          submissionData.clubId = clubId || '';
          // If partnership has requireApproval=false, mark as partnershipVerified
          if (selectedPartnership && !selectedPartnership.requireApproval) {
            submissionData.partnershipVerified = true;
            submissionData.status = 'pending';
          }
        }
        await createSubmission(submissionData);
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: editingSubmission ? "Hours updated successfully" : "Hours submitted successfully" });
      form.reset();
      setSelectedFile(null); setImagePreview(null);
      setSelectedLocation(null); setLocationSearch("");
      setSelectedEventId(''); setEventPassword(''); setPasswordError('');
      queryClient.invalidateQueries({ queryKey: ['firebase-user-submissions', user?.email, clubId] });
      queryClient.invalidateQueries({ queryKey: ['firebase-club-submissions'] });
      onSuccess();
    },
    onError: (error: any) => {
      if (error.message !== 'Incorrect event password') {
        toast({ title: "Error", description: error?.message || 'Failed to submit hours', variant: "destructive" });
      }
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Invalid file type", description: "Please select a JPG or PNG", variant: "destructive" }); return; }
    if (file.size > 1 * 1024 * 1024) { toast({ title: "File too large", description: "Max 1MB", variant: "destructive" }); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: FormData) => {
    if (requireProofImage && !selectedFile && !imagePreview) {
      toast({ title: "Proof image required", description: "Please upload an image as proof", variant: "destructive" });
      return;
    }
    submitMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.error("Validation errors:", errors))} className="space-y-4 lg:space-y-5">

      {/* Source / Partnership selection */}
      {!editingSubmission && (
        <div className="p-3 bg-gray-50 rounded-lg space-y-3">
          <div className="space-y-1">
            <Label className="text-gray-700 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Submitting hours to
            </Label>
            <Select value={source} onValueChange={(v) => { setSource(v as 'club' | 'partnership'); setSelectedPartnershipId(''); setSelectedEventId(''); }}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="club">My Club</SelectItem>
                <SelectItem value="partnership">A Partnership (food bank, business, etc.)</SelectItem>
              </SelectContent>
            </Select>
            {source === 'partnership' && (
              <p className="text-xs text-blue-600">Partnerships are organizations like food banks and businesses. You don't need to join them to submit hours.</p>
            )}
          </div>

          {source === 'partnership' && (
            <div className="space-y-1">
              <Label className="text-gray-700">Select Partnership</Label>
              <Select value={selectedPartnershipId} onValueChange={(v) => { setSelectedPartnershipId(v); setSelectedEventId(''); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Choose a partnership..." />
                </SelectTrigger>
                <SelectContent>
                  {allPartnerships.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                  {allPartnerships.length === 0 && (
                    <SelectItem value="none" disabled>No partnerships available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedPartnership && !selectedPartnership.requireApproval && (
                <Badge className="bg-green-100 text-green-700 text-xs">✓ Partnership Verified — hours are auto-approved</Badge>
              )}
            </div>
          )}

          {/* Event selection */}
          {(source === 'club' || (source === 'partnership' && selectedPartnershipId)) && (
            <div className="space-y-1">
              <Label className="text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Event <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <p className="text-xs text-gray-500">Link these hours to a specific event</p>
              <Select value={selectedEventId} onValueChange={(v) => { setSelectedEventId(v === '__none__' ? '' : v); setPasswordError(''); setEventPassword(''); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="No event (general submission)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No event — general submission</SelectItem>
                  {availableEvents.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="flex items-center gap-2">
                        {e.name}
                        {e.type === 'password' && <Badge className="text-xs bg-yellow-100 text-yellow-700">Password</Badge>}
                      </span>
                    </SelectItem>
                  ))}
                  {availableEvents.length === 0 && (
                    <SelectItem value="no-events" disabled>No events available</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Event password */}
              {selectedEvent?.type === 'password' && (
                <div className="space-y-1 pt-1">
                  <Label className="text-gray-700 text-sm">Event Password</Label>
                  <Input
                    type="text"
                    value={eventPassword}
                    onChange={e => { setEventPassword(e.target.value); setPasswordError(''); }}
                    placeholder="Enter the event password..."
                    className={`bg-white ${passwordError ? 'border-red-400' : ''}`}
                  />
                  {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Core form fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="activityName" className="text-gray-700">Activity Name</Label>
          <Input id="activityName" {...form.register("activityName")} placeholder="Enter the activity name" className="mt-1 bg-white border-gray-200 text-gray-900" />
          {form.formState.errors.activityName && <p className="text-sm text-red-600 mt-1">{form.formState.errors.activityName.message}</p>}
        </div>
        <div>
          <Label htmlFor="hours" className="text-gray-700">Number of Hours</Label>
          <Input id="hours" type="number" step="0.5" min="0" {...form.register("hours")} placeholder="e.g., 2.5" className="mt-1 bg-white border-gray-200 text-gray-900" />
          {form.formState.errors.hours && <p className="text-sm text-red-600 mt-1">{form.formState.errors.hours.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="date" className="text-gray-700">Date of Service</Label>
        <Input id="date" type="date" {...form.register("date")} className="mt-1 bg-white border-gray-200 text-gray-900" />
        {form.formState.errors.date && <p className="text-sm text-red-600 mt-1">{form.formState.errors.date.message}</p>}
      </div>

      <div className="relative">
        <Label className="text-gray-700 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Service Location <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <p className="text-sm text-gray-500 mb-2">Adding a location helps grow your club's territory on the map</p>
        {selectedLocation ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-green-700 flex-1">{selectedLocation.name}</span>
            <button type="button" onClick={clearLocation} className="text-green-600 hover:text-green-800"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            <Input
              ref={locationInputRef}
              value={locationSearch}
              onChange={e => setLocationSearch(e.target.value)}
              placeholder="Search for a location..."
              className="pl-10 bg-white border-gray-200 text-gray-900"
            />
            {isSearchingLocation && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
            {locationResults.length > 0 && locationInputRef.current && createPortal(
              <div
                style={{
                  position: 'fixed',
                  zIndex: 9999,
                  top: locationInputRef.current.getBoundingClientRect().bottom + 4,
                  left: locationInputRef.current.getBoundingClientRect().left,
                  width: locationInputRef.current.getBoundingClientRect().width,
                }}
                className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
              >
                {locationResults.map((result, index) => (
                  <button key={index} type="button" onClick={() => handleLocationSelect(result)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 border-b border-gray-100 last:border-b-0">
                    {result.display_name}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="description" className="text-gray-700">Description of Service</Label>
        <Textarea id="description" {...form.register("description")} placeholder="Describe what you did during your service hours..." className="mt-1 bg-white border-gray-200 text-gray-900" rows={4} />
        {form.formState.errors.description && <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>}
      </div>

      <div>
        <Label className="text-gray-700">Proof of Service {requireProofImage ? '(Required)' : '(Optional)'}</Label>
        <p className="text-sm text-gray-500 mb-3">Upload a photo as proof of your service (JPG or PNG, max 1MB)</p>
        {!selectedFile && !imagePreview ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to upload an image</span>
            </label>
          </div>
        ) : (
          <div className="relative">
            <img src={imagePreview || ''} alt="Preview" className="max-w-full h-48 object-cover rounded-lg border border-gray-200" />
            <button type="button" onClick={() => { setSelectedFile(null); setImagePreview(null); }} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1">
              <X className="w-4 h-4" />
            </button>
            {selectedFile && <p className="text-sm text-gray-500 mt-2">{selectedFile.name}</p>}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-100"
          onClick={() => { form.reset(); setSelectedFile(null); setImagePreview(null); setSelectedLocation(null); setLocationSearch(""); setSelectedEventId(''); setEventPassword(''); onCancel?.(); }}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitMutation.isPending} className="bg-black hover:bg-gray-800 text-white">
          {submitMutation.isPending ? 'Submitting...' : 'Submit Hours'}
        </Button>
      </div>
    </form>
  );
}
