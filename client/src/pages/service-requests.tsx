import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Plus, Users, Check, X, AlertCircle } from "lucide-react";
import type { ServiceRequest, ServiceParticipant } from "@shared/schema";

interface ServiceRequestsProps {
  user: User;
}

export default function ServiceRequests({ user }: ServiceRequestsProps) {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [participantToApprove, setParticipantToApprove] = useState<ServiceParticipant | null>(null);
  const [hoursToAward, setHoursToAward] = useState("");

  const userEmail = user.email?.replace(/\./g, ',') || '';
  const userName = user.name || user.email || '';

  const [newRequest, setNewRequest] = useState({
    requesterEmail: userEmail,
    requesterName: userName,
    requesterPhone: "",
    requesterOrganization: "",
    title: "",
    description: "",
    hoursOffered: "",
    locationName: "",
    locationLat: "0",
    locationLng: "0",
    category: "general",
    maxParticipants: "",
  });

  const { data: allRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/service-requests'],
  });

  const { data: participants = [] } = useQuery<ServiceParticipant[]>({
    queryKey: ['/api/service-requests', selectedRequest?.id, 'participants'],
    enabled: !!selectedRequest,
  });

  const { data: myParticipations = [] } = useQuery<ServiceParticipant[]>({
    queryKey: ['/api/service-participants', userEmail],
    enabled: false,
  });

  const myRequests = allRequests.filter(r => r.requesterEmail === userEmail);
  const openRequests = allRequests.filter(r => r.status === 'open' && r.requesterEmail !== userEmail);

  const createRequestMutation = useMutation({
    mutationFn: async (data: typeof newRequest) => {
      const res = await apiRequest('POST', '/api/service-requests', {
        ...data,
        hoursOffered: data.hoursOffered,
        maxParticipants: data.maxParticipants ? parseInt(data.maxParticipants) : null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      setCreateDialogOpen(false);
      setNewRequest({
        requesterEmail: userEmail,
        requesterName: userName,
        requesterPhone: "",
        requesterOrganization: "",
        title: "",
        description: "",
        hoursOffered: "",
        locationName: "",
        locationLat: "0",
        locationLng: "0",
        category: "general",
        maxParticipants: "",
      });
      toast({ title: "Request created!", description: "Volunteers can now see your request." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create request", description: error.message, variant: "destructive" });
    }
  });

  const joinRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest('POST', `/api/service-requests/${requestId}/join`, {
        userEmail,
        userName,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      toast({ title: "Joined!", description: "You've joined this service request." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    }
  });

  const approveHoursMutation = useMutation({
    mutationFn: async ({ participantId, hours }: { participantId: number; hours: string }) => {
      const res = await apiRequest('POST', `/api/service-participants/${participantId}/approve`, {
        hoursAwarded: hours,
        requesterEmail: userEmail,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests', selectedRequest?.id, 'participants'] });
      setApproveDialogOpen(false);
      toast({ title: "Hours approved!", description: "The volunteer's hours have been recorded." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    }
  });

  const handleViewRequest = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const handleApproveParticipant = (participant: ServiceParticipant) => {
    setParticipantToApprove(participant);
    setHoursToAward(selectedRequest?.hoursOffered || "");
    setApproveDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-gray-600">Request help or volunteer for community service</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-black text-white hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          Request Service
        </Button>
      </div>

      <Tabs defaultValue="available" className="space-y-4">
        <TabsList>
          <TabsTrigger value="available">Available ({openRequests.length})</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests ({myRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {openRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No service requests available right now.</p>
                <p className="text-sm">Check back later or create your own!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{request.title}</CardTitle>
                        <CardDescription>{request.requesterOrganization || request.requesterName}</CardDescription>
                      </div>
                      <Badge variant={request.isHighNeedArea ? "destructive" : "secondary"}>
                        {request.isHighNeedArea ? "High Need" : request.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center text-gray-500">
                        <MapPin className="w-4 h-4 mr-1" />
                        {request.locationName}
                      </div>
                      <div className="flex items-center text-green-600 font-medium">
                        <Clock className="w-4 h-4 mr-1" />
                        {request.hoursOffered} hrs
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewRequest(request)}
                      >
                        View Details
                      </Button>
                      <Button 
                        size="sm"
                        className="flex-1 bg-black text-white hover:bg-gray-800"
                        onClick={() => joinRequestMutation.mutate(request.id)}
                        disabled={joinRequestMutation.isPending}
                      >
                        Join
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-requests" className="space-y-4">
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>You haven't created any service requests.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Your First Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{request.title}</CardTitle>
                        <CardDescription>{request.locationName}</CardDescription>
                      </div>
                      <Badge variant={request.status === 'open' ? 'default' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{request.description}</p>
                    <Button 
                      variant="outline"
                      onClick={() => handleViewRequest(request)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Manage Participants
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Service</DialogTitle>
            <DialogDescription>
              Create a service request for volunteers to help with
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g., Community Garden Cleanup"
                value={newRequest.title}
                onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what volunteers will be doing..."
                value={newRequest.description}
                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hours Offered</Label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="e.g., 3"
                  value={newRequest.hoursOffered}
                  onChange={(e) => setNewRequest({ ...newRequest, hoursOffered: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={newRequest.category}
                  onValueChange={(value) => setNewRequest({ ...newRequest, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="shelter">Shelter</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="environment">Environment</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                placeholder="e.g., Central Park"
                value={newRequest.locationName}
                onChange={(e) => setNewRequest({ ...newRequest, locationName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Organization (optional)</Label>
              <Input
                placeholder="Your organization name"
                value={newRequest.requesterOrganization}
                onChange={(e) => setNewRequest({ ...newRequest, requesterOrganization: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone (optional)</Label>
              <Input
                placeholder="Your phone number"
                value={newRequest.requesterPhone}
                onChange={(e) => setNewRequest({ ...newRequest, requesterPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Participants (optional)</Label>
              <Input
                type="number"
                placeholder="Leave blank for unlimited"
                value={newRequest.maxParticipants}
                onChange={(e) => setNewRequest({ ...newRequest, maxParticipants: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createRequestMutation.mutate(newRequest)}
              disabled={createRequestMutation.isPending || !newRequest.title || !newRequest.description || !newRequest.hoursOffered}
              className="bg-black text-white hover:bg-gray-800"
            >
              {createRequestMutation.isPending ? "Creating..." : "Create Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title}</DialogTitle>
            <DialogDescription>
              {selectedRequest?.requesterOrganization || selectedRequest?.requesterName}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{selectedRequest.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Location:</span>
                  <p className="font-medium">{selectedRequest.locationName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Hours Offered:</span>
                  <p className="font-medium text-green-600">{selectedRequest.hoursOffered} hours</p>
                </div>
              </div>

              {selectedRequest.requesterEmail === userEmail && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Participants</h3>
                  {participants.length === 0 ? (
                    <p className="text-sm text-gray-500">No one has joined yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((p) => (
                        <div 
                          key={p.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{p.userName}</p>
                            <p className="text-xs text-gray-500">{p.userEmail.replace(/,/g, '.')}</p>
                          </div>
                          {p.hoursApproved ? (
                            <Badge className="bg-green-100 text-green-700">
                              <Check className="w-3 h-3 mr-1" />
                              {p.hoursAwarded} hrs approved
                            </Badge>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => handleApproveParticipant(p)}
                            >
                              Approve Hours
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Hours</DialogTitle>
            <DialogDescription>
              Award hours to {participantToApprove?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Hours to Award</Label>
              <Input
                type="number"
                step="0.5"
                value={hoursToAward}
                onChange={(e) => setHoursToAward(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Original offer: {selectedRequest?.hoursOffered} hours
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => participantToApprove && approveHoursMutation.mutate({
                participantId: participantToApprove.id,
                hours: hoursToAward,
              })}
              disabled={approveHoursMutation.isPending || !hoursToAward}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {approveHoursMutation.isPending ? "Approving..." : "Approve Hours"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
