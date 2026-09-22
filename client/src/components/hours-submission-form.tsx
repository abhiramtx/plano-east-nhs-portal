import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  User, HoursSubmission, createSubmission, updateSubmission,
  getUserProfile, getProfileDisplayName,
  getClubEvents, ClubEvent,
  checkInUser,
} from "@/lib/firebase";
import { extractProofImageMetadata } from "@/lib/proof-image-metadata";
import type { HoursLog } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, MapPin, Loader2, Calendar, Search } from "lucide-react";

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

const MAX_PROOF_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;

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
  clubName?: string;
  logId?: string;
  logName?: string;
  requireProofImage?: boolean;
}

export function HoursSubmissionForm({ user, onSuccess, onCancel, editingSubmission, clubId, clubName, logId, logName, requireProofImage = false }: HoursSubmissionFormProps) {
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
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (locationResults.length > 0 && locationInputRef.current) {
      const r = locationInputRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width });
    } else {
      setDropdownPos(null);
    }
  }, [locationResults.length]);

  const [selectedEventId, setSelectedEventId] = useState(editingSubmission?.eventId || '');
  const [eventPassword, setEventPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Super-club opt-in (sub-club submissions can also be sent to the super-club)
  const [alsoSubmitToSuper, setAlsoSubmitToSuper] = useState<boolean>(!!editingSubmission?.superClubId);

  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ['firebase-user-profile-hours-form', user?.email],
    queryFn: () => getUserProfile(user!.email),
    enabled: !!user?.email,
    staleTime: 60000,
  });

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
    enabled: !!clubId,
  });

  const superClub: any = undefined;
  const superHoursLogs: HoursLog[] = [];
  // Find the "Sub-Club Hours" system log in the superclub's logs
  const subClubHoursLog = superHoursLogs.find(l => (l as any).isSystem || l.name === 'Sub-Club Hours');

  const availableEvents = clubEvents.filter(e => e.isOpen !== false && e.type !== 'scan_qr' && e.type !== 'show_qr');
  const selectedEvent = availableEvents.find(e => e.id === selectedEventId) || null;

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

      // Validate super-club opt-in: require Sub-Club Hours log to be open
      if (alsoSubmitToSuper && superClub) {
        if (!subClubHoursLog || subClubHoursLog.isOpen === false) {
          throw new Error(`${superClub.superClubName}'s Sub-Club Hours log is not open right now.`);
        }
      }

      let proofImageUrl = editingSubmission?.proofImageUrl;
      let proofImageMetadata = editingSubmission?.proofImageMetadata;
      if (selectedFile) {
        proofImageMetadata = await extractProofImageMetadata(selectedFile);
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
        if (proofImageMetadata !== undefined) updateData.proofImageMetadata = proofImageMetadata;
        if (selectedLocation) {
          updateData.latitude = selectedLocation.lat;
          updateData.longitude = selectedLocation.lng;
          updateData.location = selectedLocation.name;
        }
        // Sync super-club opt-in fields on edit — always use the system Sub-Club Hours log
        if (alsoSubmitToSuper && superClub) {
          updateData.superClubId = superClub.superClubId;
          updateData.superClubName = superClub.superClubName;
          if (subClubHoursLog) {
            updateData.superClubLogId = String(subClubHoursLog.id);
            updateData.superClubLogName = subClubHoursLog.name;
          }
          // Reset super-club approval to pending so it re-enters the queue
          const existingSuper = (editingSubmission as any).superClubStatus || {};
          updateData.superClubStatus = {
            ...existingSuper,
            [superClub.superClubId]: {
              ...(existingSuper[superClub.superClubId] || {}),
              status: 'pending',
              hours: parseFloat(data.hours),
            },
          };
        } else if (!alsoSubmitToSuper && (editingSubmission as any).superClubId) {
          updateData.superClubId = null;
          updateData.superClubName = null;
          updateData.superClubLogId = null;
          updateData.superClubLogName = null;
        }
        await updateSubmission(editingSubmission.id, updateData);
      } else {
        const submissionData: any = {
          clubId: clubId || '',
          userEmail: user?.email || '',
          userName: getProfileDisplayName(profile, user?.email || ''),
          hours: parseFloat(data.hours),
          description: data.description,
          activityName: data.activityName,
          date: new Date(data.date).toISOString(),
          createdAt: now,
        };
        if (proofImageUrl) submissionData.proofImageUrl = proofImageUrl;
        if (proofImageMetadata) submissionData.proofImageMetadata = proofImageMetadata;
        if (selectedLocation) {
          submissionData.latitude = selectedLocation.lat;
          submissionData.longitude = selectedLocation.lng;
          submissionData.location = selectedLocation.name;
        }
        if (logId) submissionData.logId = logId;
        if (logName) submissionData.logName = logName;
        if (clubName) submissionData.subClubName = clubName;
        if (selectedEventId) {
          submissionData.eventId = selectedEventId;
          submissionData.eventName = selectedEvent?.name;
        }
        if (alsoSubmitToSuper && superClub) {
          submissionData.superClubId = superClub.superClubId;
          submissionData.superClubName = superClub.superClubName;
          if (subClubHoursLog) {
            submissionData.superClubLogId = String(subClubHoursLog.id);
            submissionData.superClubLogName = subClubHoursLog.name;
          }
          submissionData.superClubStatus = {
            [superClub.superClubId]: {
              status: 'pending',
              hours: parseFloat(data.hours),
            },
          };
        }
        await createSubmission(submissionData);

        // Record attendance so the person appears in the event's Grant Hours tab
        if (selectedEventId && selectedEvent) {
          try {
            await checkInUser(
              selectedEventId,
              selectedEvent.name,
              user?.email || '',
              user?.name || '',
              clubId || undefined,
              parseFloat(data.hours),
            );
          } catch {}
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: editingSubmission ? "Hours updated successfully" : "Hours submitted successfully" });
      form.reset();
      setSelectedFile(null); setImagePreview(null);
      setSelectedLocation(null); setLocationSearch("");
      setSelectedEventId(''); setEventPassword(''); setPasswordError('');
      setAlsoSubmitToSuper(false);
      queryClient.invalidateQueries({ queryKey: ['firebase-user-submissions', user?.email, clubId] });
      queryClient.invalidateQueries({ queryKey: ['firebase-club-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['super-club-fed-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-pending-submissions'] });
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
    if (file.size > MAX_PROOF_IMAGE_SIZE_BYTES) { toast({ title: "File too large", description: "Max 20MB", variant: "destructive" }); return; }
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

      {/* Event selection */}
      {!editingSubmission && (
        <div className="p-3 bg-[#faf8f4] rounded-lg space-y-3">
          <div className="space-y-1">
              <Label className="text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Event <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <p className="text-xs text-gray-500">Link these hours to a specific event</p>
              <Select value={selectedEventId} onValueChange={(v) => { setSelectedEventId(v === '__none__' ? '' : v); setPasswordError(''); setEventPassword(''); }}>
                <SelectTrigger className="bg-[#faf8f4]">
                  <SelectValue placeholder="No event (general submission)" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
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
                    className={`bg-[#faf8f4] ${passwordError ? 'border-red-400' : ''}`}
                  />
                  {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
                </div>
              )}
            </div>
        </div>
      )}

      {/* Super-club opt-in */}
      {superClub && (
        <div className="p-3 bg-background border border-border rounded-lg space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={alsoSubmitToSuper}
              onChange={e => setAlsoSubmitToSuper(e.target.checked)}
              className="mt-1"
              disabled={!subClubHoursLog || subClubHoursLog.isOpen === false}
            />
            <span className="text-sm text-foreground">
              <strong>ALSO SUBMIT TO {superClub.superClubName.toUpperCase()}</strong>
              <span className="block text-xs text-muted-foreground mt-0.5 font-normal">
                {!subClubHoursLog
                  ? `${superClub.superClubName}'s Sub-Club Hours log isn't set up yet — check back later.`
                  : subClubHoursLog.isOpen === false
                  ? `${superClub.superClubName}'s Sub-Club Hours log is currently closed. Ask their admin to open it.`
                  : `Sends a copy to ${superClub.superClubName}'s Sub-Club Hours log for separate approval. The super-club admin can approve/reject independently.`}
              </span>
            </span>
          </label>
        </div>
      )}

      {/* Core form fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="activityName" className="text-gray-700">Activity Name</Label>
          <Input id="activityName" {...form.register("activityName")} placeholder="Enter the activity name" className="mt-1 bg-[#faf8f4] border-[#d9cdbd] text-gray-900" />
          {form.formState.errors.activityName && <p className="text-sm text-red-600 mt-1">{form.formState.errors.activityName.message}</p>}
        </div>
        <div>
          <Label htmlFor="hours" className="text-gray-700">Number of Hours</Label>
          <Input id="hours" type="number" step="0.5" min="0" {...form.register("hours")} placeholder="e.g., 2.5" className="mt-1 bg-[#faf8f4] border-[#d9cdbd] text-gray-900" />
          {form.formState.errors.hours && <p className="text-sm text-red-600 mt-1">{form.formState.errors.hours.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="date" className="text-gray-700">Date of Service</Label>
        <Input id="date" type="date" {...form.register("date")} className="mt-1 bg-[#faf8f4] border-[#d9cdbd] text-gray-900" />
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
              className="pl-10 bg-[#faf8f4] border-[#d9cdbd] text-gray-900"
            />
            {isSearchingLocation && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
            {dropdownPos && locationResults.length > 0 && createPortal(
              <div
                data-location-suggestions=""
                style={{
                  position: 'fixed',
                  zIndex: 9999,
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                  pointerEvents: 'auto',
                }}
                className="bg-[#faf8f4] border border-[#d9cdbd] rounded-lg shadow-xl max-h-48 overflow-y-auto"
              >
                {locationResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); handleLocationSelect(result); }}
                    className="w-full text-left px-4 py-2 hover:bg-[#faf8f4] text-sm text-gray-700 border-b border-[#d9cdbd] last:border-b-0"
                  >
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
        <Textarea id="description" {...form.register("description")} placeholder="Describe what you did during your service hours..." className="mt-1 bg-[#faf8f4] border-[#d9cdbd] text-gray-900" rows={4} />
        {form.formState.errors.description && <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>}
      </div>

      <div>
        <Label className="text-gray-700">Proof of Service {requireProofImage ? '(Required)' : '(Optional)'}</Label>
        <p className="text-sm text-gray-500 mb-3">Upload a photo as proof of your service (JPG or PNG, max 20MB)</p>
        {!selectedFile && !imagePreview ? (
          <div className="border-2 border-dashed border-[#c9bfae] rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to upload an image</span>
            </label>
          </div>
        ) : (
          <div className="relative">
            <img src={imagePreview || ''} alt="Preview" className="max-w-full h-48 object-cover rounded-lg border border-[#d9cdbd]" />
            <button type="button" onClick={() => { setSelectedFile(null); setImagePreview(null); }} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1">
              <X className="w-4 h-4" />
            </button>
            {selectedFile && <p className="text-sm text-gray-500 mt-2">{selectedFile.name}</p>}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" className="border-[#d9cdbd] text-gray-600 hover:bg-gray-100"
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
