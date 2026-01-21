import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  User, 
  getCurrentUser,
  ServiceRequest,
  ServiceRequestParticipant,
  getOpenServiceRequests,
  getMyServiceRequests,
  getUserParticipations,
  createServiceRequest,
  updateServiceRequest,
  deleteServiceRequest,
  getRequestParticipants,
  joinServiceRequest,
  updateParticipant,
  removeParticipant,
} from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, MapPin, Clock, User as UserIcon, Building, Phone, Mail, 
  Calendar, Users, Check, X, Trash2, Edit, Eye, Award
} from "lucide-react";
import { LocationPicker } from "@/components/world-map";

export default function ServiceRequests() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [awardHoursDialogOpen, setAwardHoursDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<ServiceRequestParticipant | null>(null);
  const [hoursToAward, setHoursToAward] = useState("");
  
  const [newRequest, setNewRequest] = useState({
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
      setNewRequest(prev => ({
        ...prev,
        contactEmail: currentUser.email || "",
      }));
    }
  }, []);

  const userEmail = user?.email || '';

  const { data: openRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ['firebase-open-service-requests'],
    queryFn: getOpenServiceRequests,
  });

  const { data: myRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ['firebase-my-service-requests', userEmail],
    queryFn: () => getMyServiceRequests(userEmail),
    enabled: !!userEmail,
  });

  const { data: myParticipations = [] } = useQuery<ServiceRequestParticipant[]>({
    queryKey: ['firebase-my-participations', userEmail],
    queryFn: () => getUserParticipations(userEmail),
    enabled: !!userEmail,
  });

  const { data: participants = [] } = useQuery<ServiceRequestParticipant[]>({
    queryKey: ['firebase-request-participants', selectedRequest?.id],
    queryFn: () => selectedRequest ? getRequestParticipants(selectedRequest.id) : Promise.resolve([]),
    enabled: !!selectedRequest && manageDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return await createServiceRequest({
        ...newRequest,
        createdBy: userEmail,
        creatorName: user?.name || userEmail.split('@')[0],
        creatorEmail: userEmail,
        hoursOffered: newRequest.hoursOffered,
        latitude: newRequest.latitude || undefined,
        longitude: newRequest.longitude || undefined,
        maxParticipants: newRequest.maxParticipants || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-open-service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-my-service-requests'] });
      setCreateDialogOpen(false);
      setNewRequest({
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
      toast({ title: "Service request created!", description: "Volunteers can now see and join your request." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create request", description: error.message, variant: "destructive" });
    }
  });

  const joinMutation = useMutation({
    mutationFn: async (request: ServiceRequest) => {
      return await joinServiceRequest(request.id, userEmail, user?.name || userEmail.split('@')[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-my-participations'] });
      toast({ title: "Joined!", description: "You've successfully joined this service request." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    }
  });

  const awardHoursMutation = useMutation({
    mutationFn: async ({ participantId, hours }: { participantId: string; hours: number }) => {
      await updateParticipant(participantId, {
        status: 'completed',
        hoursAwarded: hours,
        approvedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-request-participants'] });
      setAwardHoursDialogOpen(false);
      toast({ title: "Hours awarded!", description: "The volunteer has been credited with their hours." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to award hours", description: error.message, variant: "destructive" });
    }
  });

  const kickParticipantMutation = useMutation({
    mutationFn: async (participantId: string) => {
      await removeParticipant(participantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-request-participants'] });
      toast({ title: "Participant removed" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove participant", description: error.message, variant: "destructive" });
    }
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await deleteServiceRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-open-service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-my-service-requests'] });
      setManageDialogOpen(false);
      toast({ title: "Request deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    }
  });

  const hasJoined = (requestId: string) => {
    return myParticipations.some(p => p.requestId === requestId);
  };

  const isMyRequest = (request: ServiceRequest) => {
    return request.creatorEmail === userEmail;
  };

  const handleCreateRequest = () => {
    if (!newRequest.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (!newRequest.description.trim()) {
      toast({ title: "Description required", variant: "destructive" });
      return;
    }
    if (!newRequest.location.trim()) {
      toast({ title: "Location required", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const handleViewRequest = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const handleManageRequest = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setManageDialogOpen(true);
  };

  const handleAwardHours = (participant: ServiceRequestParticipant) => {
    setSelectedParticipant(participant);
    setHoursToAward(selectedRequest?.hoursOffered.toString() || "1");
    setAwardHoursDialogOpen(true);
  };

  const RequestCard = ({ request, showActions = true }: { request: ServiceRequest; showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{request.title}</CardTitle>
            {request.organizationName && (
              <CardDescription className="flex items-center mt-1">
                <Building className="w-3 h-3 mr-1" />
                {request.organizationName}
              </CardDescription>
            )}
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Clock className="w-3 h-3 mr-1" />
            {request.hoursOffered} hours
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            {request.location}
          </span>
          {request.dateTime && (
            <span className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(request.dateTime).toLocaleDateString()}
            </span>
          )}
          {request.maxParticipants && (
            <span className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              Max {request.maxParticipants}
            </span>
          )}
        </div>
      </CardContent>
      {showActions && (
        <CardFooter className="pt-0 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleViewRequest(request)}>
            <Eye className="w-4 h-4 mr-1" /> View
          </Button>
          {isMyRequest(request) ? (
            <Button size="sm" onClick={() => handleManageRequest(request)}>
              <Users className="w-4 h-4 mr-1" /> Manage
            </Button>
          ) : hasJoined(request.id) ? (
            <Badge variant="secondary" className="px-3 py-1">Joined</Badge>
          ) : (
            <Button 
              size="sm" 
              onClick={() => joinMutation.mutate(request)}
              disabled={joinMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-1" /> Join
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );

  return (
    <div className="p-6 space-y-6 max-h-screen overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
            <p className="text-gray-600">Find volunteer opportunities or request help</p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Request Service
        </Button>
      </div>

      <Tabs defaultValue="available" className="space-y-4">
        <TabsList>
          <TabsTrigger value="available">Available ({openRequests.length})</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests ({myRequests.length})</TabsTrigger>
          <TabsTrigger value="joined">Joined ({myParticipations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {openRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No service requests available yet.</p>
              <p className="text-sm text-gray-400">Be the first to request help!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-requests" className="space-y-4">
          {myRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <Building className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">You haven't created any service requests yet.</p>
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Request
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="joined" className="space-y-4">
          {myParticipations.length === 0 ? (
            <Card className="p-8 text-center">
              <Check className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">You haven't joined any service requests yet.</p>
              <p className="text-sm text-gray-400">Browse available requests to get started!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {myParticipations.map(participation => {
                const request = openRequests.find(r => r.id === participation.requestId) || 
                               myRequests.find(r => r.id === participation.requestId);
                return (
                  <Card key={participation.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{request?.title || "Service Request"}</h3>
                        <p className="text-sm text-gray-500">Joined {participation.joinedAt.toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          participation.status === 'completed' ? 'default' :
                          participation.status === 'approved' ? 'secondary' : 'outline'
                        }>
                          {participation.status}
                        </Badge>
                        {participation.hoursAwarded && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {participation.hoursAwarded} hrs awarded
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Service</DialogTitle>
            <DialogDescription>
              Create a service request for volunteers to help with
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input
                  value={newRequest.title}
                  onChange={e => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Park Cleanup Day"
                />
              </div>
              <div className="col-span-2">
                <Label>Description *</Label>
                <Textarea
                  value={newRequest.description}
                  onChange={e => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the volunteer work needed..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Hours Offered *</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={newRequest.hoursOffered}
                  onChange={e => setNewRequest(prev => ({ ...prev, hoursOffered: parseFloat(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  min="1"
                  value={newRequest.maxParticipants}
                  onChange={e => setNewRequest(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 10 }))}
                />
              </div>
              <div>
                <Label>Organization Name</Label>
                <Input
                  value={newRequest.organizationName}
                  onChange={e => setNewRequest(prev => ({ ...prev, organizationName: e.target.value }))}
                  placeholder="Your organization"
                />
              </div>
              <div>
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={newRequest.dateTime}
                  onChange={e => setNewRequest(prev => ({ ...prev, dateTime: e.target.value }))}
                />
              </div>
              <div>
                <Label>Contact Email *</Label>
                <Input
                  type="email"
                  value={newRequest.contactEmail}
                  onChange={e => setNewRequest(prev => ({ ...prev, contactEmail: e.target.value }))}
                />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input
                  type="tel"
                  value={newRequest.contactPhone}
                  onChange={e => setNewRequest(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="col-span-2">
                <Label>Location *</Label>
                <Input
                  value={newRequest.location}
                  onChange={e => setNewRequest(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Address or location description"
                />
              </div>
              <div className="col-span-2">
                <Label>Requirements (Optional)</Label>
                <Textarea
                  value={newRequest.requirements}
                  onChange={e => setNewRequest(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="Any special requirements or skills needed..."
                  rows={2}
                />
              </div>
              <div className="col-span-2">
                <Label>Pin Location on Map (Optional)</Label>
                <LocationPicker
                  value={newRequest.latitude && newRequest.longitude ? 
                    { lat: newRequest.latitude, lng: newRequest.longitude } : null}
                  onChange={(lat: number, lng: number) => setNewRequest(prev => ({ 
                    ...prev, 
                    latitude: lat, 
                    longitude: lng 
                  }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <p className="text-gray-600">{selectedRequest.description}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {selectedRequest.hoursOffered} hours
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {selectedRequest.location}
                </div>
                {selectedRequest.organizationName && (
                  <div className="flex items-center text-gray-600">
                    <Building className="w-4 h-4 mr-2" />
                    {selectedRequest.organizationName}
                  </div>
                )}
                {selectedRequest.dateTime && (
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(selectedRequest.dateTime).toLocaleString()}
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  {selectedRequest.contactEmail}
                </div>
                {selectedRequest.contactPhone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {selectedRequest.contactPhone}
                  </div>
                )}
              </div>
              {selectedRequest.requirements && (
                <div>
                  <h4 className="font-medium mb-1">Requirements</h4>
                  <p className="text-sm text-gray-600">{selectedRequest.requirements}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedRequest && !isMyRequest(selectedRequest) && !hasJoined(selectedRequest.id) && (
              <Button 
                onClick={() => {
                  joinMutation.mutate(selectedRequest);
                  setViewDialogOpen(false);
                }}
                disabled={joinMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" /> Join This Request
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage: {selectedRequest?.title}</DialogTitle>
            <DialogDescription>
              View and manage volunteers who joined your service request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Participants ({participants.length})</h3>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => selectedRequest && deleteRequestMutation.mutate(selectedRequest.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete Request
              </Button>
            </div>
            {participants.length === 0 ? (
              <Card className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No volunteers have joined yet.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {participants.map(participant => (
                  <Card key={participant.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{participant.userName}</p>
                        <p className="text-sm text-gray-500">{participant.userEmail}</p>
                        <p className="text-xs text-gray-400">
                          Joined {participant.joinedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          participant.status === 'completed' ? 'default' :
                          participant.status === 'approved' ? 'secondary' : 'outline'
                        }>
                          {participant.status}
                        </Badge>
                        {participant.hoursAwarded && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {participant.hoursAwarded} hrs
                          </Badge>
                        )}
                        {participant.status === 'joined' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAwardHours(participant)}
                            >
                              <Award className="w-4 h-4 mr-1" /> Award Hours
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => kickParticipantMutation.mutate(participant.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={awardHoursDialogOpen} onOpenChange={setAwardHoursDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award Hours</DialogTitle>
            <DialogDescription>
              Award volunteer hours to {selectedParticipant?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Hours to Award</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={hoursToAward}
                onChange={e => setHoursToAward(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwardHoursDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedParticipant) {
                  awardHoursMutation.mutate({
                    participantId: selectedParticipant.id,
                    hours: parseFloat(hoursToAward) || 1,
                  });
                }
              }}
              disabled={awardHoursMutation.isPending}
            >
              Award Hours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
