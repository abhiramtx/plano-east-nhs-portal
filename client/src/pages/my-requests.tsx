import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  getCurrentUser,
  User,
  ServiceRequest,
  ServiceRequestParticipant,
  getMyServiceRequests,
  createServiceRequest,
  updateServiceRequest,
  deleteServiceRequest,
  getRequestParticipants,
  updateParticipant,
  removeParticipant,
} from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Plus, MapPin, Clock, Building, Phone, Mail, Calendar, Users, 
  Check, X, Trash2, Edit, Award, Eye, UserMinus, UserCheck, ChevronRight
} from "lucide-react";
import { LocationPicker } from "@/components/world-map";

export default function MyRequests() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<ServiceRequestParticipant | null>(null);
  const [hoursToAward, setHoursToAward] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    hoursOffered: 1,
    contactEmail: "",
    contactPhone: "",
    organizationName: "",
    location: "",
    latitude: null as number | null,
    longitude: null as number | null,
    maxParticipants: 10,
    dateTime: "",
    requirements: "",
  });

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setFormData(prev => ({ ...prev, contactEmail: currentUser.email || "" }));
    }
  }, []);

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center h-96 bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const userEmail = user?.email || '';

  const { data: myRequests = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ['firebase-my-service-requests', userEmail],
    queryFn: () => getMyServiceRequests(userEmail),
    enabled: !!userEmail,
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery<ServiceRequestParticipant[]>({
    queryKey: ['firebase-request-participants', selectedRequest?.id],
    queryFn: () => selectedRequest ? getRequestParticipants(selectedRequest.id) : Promise.resolve([]),
    enabled: !!selectedRequest && manageDialogOpen,
  });

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({ title: "Title required", description: "Please enter a title for your request.", variant: "destructive" });
      return false;
    }
    if (formData.hoursOffered < 0.5) {
      toast({ title: "Invalid hours", description: "Hours offered must be at least 0.5.", variant: "destructive" });
      return false;
    }
    if (formData.maxParticipants < 1) {
      toast({ title: "Invalid participants", description: "Max participants must be at least 1.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) throw new Error("Validation failed");
      return await createServiceRequest({
        ...formData,
        createdBy: userEmail,
        creatorEmail: userEmail,
        creatorName: user?.name || userEmail.split('@')[0],
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-my-service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-open-service-requests'] });
      setCreateDialogOpen(false);
      resetForm();
      toast({ title: "Request created!", description: "Your service request is now live." });
    },
    onError: (error: any) => {
      if (error.message !== "Validation failed") {
        toast({ title: "Failed to create", description: error.message, variant: "destructive" });
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest) throw new Error("No request selected");
      if (!validateForm()) throw new Error("Validation failed");
      return await updateServiceRequest(selectedRequest.id, {
        ...formData,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-my-service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-open-service-requests'] });
      setEditDialogOpen(false);
      resetForm();
      toast({ title: "Request updated!" });
    },
    onError: (error: any) => {
      if (error.message !== "Validation failed") {
        toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest) throw new Error("No request selected");
      await deleteServiceRequest(selectedRequest.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-my-service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-open-service-requests'] });
      setDeleteDialogOpen(false);
      setSelectedRequest(null);
      toast({ title: "Request deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    }
  });

  const awardHoursMutation = useMutation({
    mutationFn: async ({ participantId, hours }: { participantId: string; hours: number }) => {
      if (!selectedRequest) throw new Error("No request selected");
      await updateParticipant(participantId, {
        status: 'completed',
        hoursAwarded: hours,
        approvedAt: new Date(),
      }, { requestId: selectedRequest.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-request-participants'] });
      setAwardDialogOpen(false);
      setSelectedParticipant(null);
      setHoursToAward("");
      toast({ title: "Hours awarded!", description: "The volunteer has been credited." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to award", description: error.message, variant: "destructive" });
    }
  });

  const kickMutation = useMutation({
    mutationFn: async (participantId: string) => {
      if (!selectedRequest) throw new Error("No request selected");
      await removeParticipant(participantId, { requestId: selectedRequest.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-request-participants'] });
      toast({ title: "Participant removed" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      hoursOffered: 1,
      contactEmail: userEmail,
      contactPhone: "",
      organizationName: "",
      location: "",
      latitude: null,
      longitude: null,
      maxParticipants: 10,
      dateTime: "",
      requirements: "",
    });
    setSelectedRequest(null);
  };

  const openEditDialog = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setFormData({
      title: request.title,
      description: request.description || "",
      hoursOffered: request.hoursOffered,
      contactEmail: request.contactEmail || "",
      contactPhone: request.contactPhone || "",
      organizationName: request.organizationName || "",
      location: request.location || "",
      latitude: request.latitude || null,
      longitude: request.longitude || null,
      maxParticipants: request.maxParticipants || 10,
      dateTime: request.dateTime || "",
      requirements: request.requirements || "",
    });
    setEditDialogOpen(true);
  };

  const openManageDialog = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setManageDialogOpen(true);
  };

  const pendingCount = participants.filter(p => p.status === 'joined').length;
  const completedCount = participants.filter(p => p.status === 'completed').length;

  return (
    <div className="p-6 max-h-screen overflow-y-auto bg-white pt-16 lg:pt-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Service Requests</h1>
          <p className="text-gray-500">Manage your volunteer opportunities and participants</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-black text-white hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          Create Request
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : myRequests.length === 0 ? (
        <Card className="p-12 text-center bg-gray-50 border-gray-200">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
          <p className="text-gray-500 mb-6">Create your first service request to find volunteers</p>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-black text-white hover:bg-gray-800">
            <Plus className="w-4 h-4 mr-2" />
            Create Request
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myRequests.map((request) => (
            <Card key={request.id} className="bg-white border-gray-200 hover:border-gray-300 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-gray-900">{request.title}</CardTitle>
                    {request.organizationName && (
                      <CardDescription className="flex items-center mt-1 text-gray-500">
                        <Building className="w-4 h-4 mr-1" />
                        {request.organizationName}
                      </CardDescription>
                    )}
                  </div>
                  <Badge className={request.status === 'open' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}>
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500 line-clamp-2">{request.description}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {request.hoursOffered} hours offered
                  </span>
                  {request.location && (
                    <span className="text-gray-500 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {request.location}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-100"
                    onClick={() => openManageDialog(request)}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Manage
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-gray-200 text-gray-600 hover:bg-gray-100"
                    onClick={() => openEditDialog(request)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-500 border-gray-200 hover:text-red-600 hover:bg-red-50"
                    onClick={() => { setSelectedRequest(request); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Create Service Request</DialogTitle>
            <DialogDescription className="text-gray-500">
              Post a volunteer opportunity for others to join
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-gray-700">Title *</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  placeholder="e.g., Beach Cleanup Event"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-gray-700">Description</Label>
                <Textarea
                  className="bg-white border-gray-200 text-gray-900"
                  placeholder="Describe the volunteer opportunity..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Hours Offered *</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  type="number"
                  min={1}
                  value={formData.hoursOffered}
                  onChange={(e) => setFormData({ ...formData, hoursOffered: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Max Participants</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  type="number"
                  min={1}
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Organization Name</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  placeholder="Your organization"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Location</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  placeholder="City, State"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Contact Email</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Contact Phone</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-gray-700">Date & Time</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-gray-700">Map Location</Label>
                <LocationPicker
                  value={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : null}
                  onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-100" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button 
              onClick={() => createMutation.mutate()}
              disabled={!formData.title || createMutation.isPending}
              className="bg-black text-white hover:bg-gray-800"
            >
              {createMutation.isPending ? "Creating..." : "Create Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Edit Service Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-gray-700">Title *</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-gray-700">Description</Label>
                <Textarea
                  className="bg-white border-gray-200 text-gray-900"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Hours Offered *</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  type="number"
                  min={1}
                  value={formData.hoursOffered}
                  onChange={(e) => setFormData({ ...formData, hoursOffered: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Max Participants</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  type="number"
                  min={1}
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Organization Name</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Location</Label>
                <Input
                  className="bg-white border-gray-200 text-gray-900"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-100" onClick={() => { setEditDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button 
              onClick={() => updateMutation.mutate()}
              disabled={!formData.title || updateMutation.isPending}
              className="bg-black text-white hover:bg-gray-800"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Users className="w-5 h-5" />
              Manage Participants - {selectedRequest?.title}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              View, approve, and manage volunteers for this request
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-4 mb-4">
            <Card className="flex-1 p-4 text-center bg-gray-50 border-gray-200">
              <p className="text-2xl font-bold text-gray-900">{participants.length}</p>
              <p className="text-sm text-gray-500">Total Joined</p>
            </Card>
            <Card className="flex-1 p-4 text-center bg-yellow-50 border-yellow-200">
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </Card>
            <Card className="flex-1 p-4 text-center bg-green-50 border-green-200">
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </Card>
          </div>

          {participantsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No volunteers have joined yet
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((participant) => (
                <Card key={participant.id} className="p-4 bg-gray-50 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{participant.userName}</p>
                        <p className="text-sm text-gray-500">{participant.userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {participant.status === 'completed' ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <Check className="w-3 h-3 mr-1" />
                          {participant.hoursAwarded}h awarded
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => { setSelectedParticipant(participant); setHoursToAward(String(selectedRequest?.hoursOffered || 1)); setAwardDialogOpen(true); }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Award className="w-4 h-4 mr-1" />
                            Award Hours
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 border-gray-200 hover:bg-red-50"
                            onClick={() => kickMutation.mutate(participant.id)}
                            disabled={kickMutation.isPending}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Award Hours</DialogTitle>
            <DialogDescription className="text-gray-500">
              Confirm the hours to award to {selectedParticipant?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Hours to Award</Label>
              <Input
                className="bg-white border-gray-200 text-gray-900"
                type="number"
                min={0.5}
                step={0.5}
                value={hoursToAward}
                onChange={(e) => setHoursToAward(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-100" onClick={() => { setAwardDialogOpen(false); setSelectedParticipant(null); }}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedParticipant && hoursToAward) {
                  awardHoursMutation.mutate({ participantId: selectedParticipant.id, hours: parseFloat(hoursToAward) });
                }
              }}
              disabled={!hoursToAward || awardHoursMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {awardHoursMutation.isPending ? "Awarding..." : "Award Hours"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Delete Request</DialogTitle>
            <DialogDescription className="text-gray-500">
              Are you sure you want to delete "{selectedRequest?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-100" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
