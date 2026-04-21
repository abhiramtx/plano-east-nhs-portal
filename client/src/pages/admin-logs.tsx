import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Club } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Trash2, 
  Edit2,
  Save,
  BookOpen,
  ArrowUpCircle
} from "lucide-react";
import type { HoursLog } from "@shared/schema";

interface AdminLogsProps {
  user: User | null;
  club: Club;
}

export function AdminLogs({ user, club }: AdminLogsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    hoursRequired: 15,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery<HoursLog[]>({
    queryKey: ['/api/hours-logs', club.id],
    queryFn: async () => {
      const response = await fetch(`/api/hours-logs/${club.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error('Failed to fetch hours logs');
      return response.json() as Promise<HoursLog[]>;
    },
  });

  const createLogMutation = useMutation({
    mutationFn: async (data: { name: string; hoursRequired: number }) => {
      const payload = { ...data, clubId: club.id };
      const response = await apiRequest('POST', '/api/hours-logs', payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hours-logs', club.id] });
      toast({ title: "Success", description: "Log created successfully" });
      setFormData({ name: "", hoursRequired: 15 });
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create log", variant: "destructive" });
    }
  });

  const updateLogMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; hoursRequired?: number; isOpen?: boolean }) => {
      const { id, ...updates } = data;
      const response = await apiRequest('PUT', `/api/hours-logs/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hours-logs', club.id] });
      toast({ title: "Success", description: "Log updated successfully" });
      setIsEditingId(null);
      setFormData({ name: "", hoursRequired: 15 });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update log", variant: "destructive" });
    }
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (logId: string) => {
      await apiRequest('DELETE', `/api/hours-logs/${logId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hours-logs', club.id] });
      toast({ title: "Success", description: "Log deleted successfully" });
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to delete log";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  });

  const handleAdd = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Please enter a log name", variant: "destructive" });
      return;
    }
    createLogMutation.mutate(formData);
  };

  const handleUpdate = (log: HoursLog) => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Please enter a log name", variant: "destructive" });
      return;
    }
    updateLogMutation.mutate({ id: log.id, ...formData });
  };

  const handleToggleOpen = (log: HoursLog) => {
    updateLogMutation.mutate({ id: log.id, isOpen: !log.isOpen });
  };

  const startEdit = (log: HoursLog) => {
    setFormData({ name: log.name, hoursRequired: log.hoursRequired });
    setIsEditingId(log.id);
  };

  const cancelEdit = () => {
    setIsEditingId(null);
    setFormData({ name: "", hoursRequired: 15 });
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

  const systemLogs = logs.filter(l => l.isSystem);
  const regularLogs = logs.filter(l => !l.isSystem);

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Hours Logs</h1>
              <p className="text-gray-600 mt-1">Create and manage hour-tracking logs (e.g., "Fall Semester")</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-black rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-6">
        {/* System logs (e.g. Sub-Club Hours) */}
        {systemLogs.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">System Logs</p>
            {systemLogs.map((log: HoursLog) => (
              <Card key={log.id} className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4 text-blue-600" />
                        <h3 className="text-base font-medium text-blue-900">{log.name}</h3>
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">System</Badge>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        Receives hours federated from sub-clubs. Sub-clubs submit here automatically — you cannot submit directly from this club.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-blue-700">{log.isOpen ? 'Open' : 'Closed'}</Label>
                        <Switch
                          checked={log.isOpen}
                          onCheckedChange={() => handleToggleOpen(log)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Regular logs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Your Logs</p>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-black hover:bg-gray-800 text-white">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Log
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Hours Log</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="logName" className="text-gray-900">Log Name</Label>
                    <Input
                      id="logName"
                      placeholder="e.g., Fall Semester"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hoursRequired" className="text-gray-900">Hours Required</Label>
                    <Input
                      id="hoursRequired"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.hoursRequired}
                      onChange={(e) => setFormData({ ...formData, hoursRequired: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum hours volunteers must complete for this log</p>
                  </div>
                  <Button
                    onClick={handleAdd}
                    disabled={createLogMutation.isPending}
                    className="w-full bg-black hover:bg-gray-800 text-white"
                  >
                    {createLogMutation.isPending ? "Creating..." : "Create Log"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {regularLogs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No custom logs yet</h3>
                <p className="text-gray-500">Create your first log to start tracking hours by period</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {regularLogs.map((log: HoursLog) => (
                <Card key={log.id}>
                  <CardContent className="p-4">
                    {isEditingId === log.id ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`edit-name-${log.id}`} className="text-gray-900">Log Name</Label>
                          <Input
                            id={`edit-name-${log.id}`}
                            placeholder="e.g., Fall Semester"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-hours-${log.id}`} className="text-gray-900">Hours Required</Label>
                          <Input
                            id={`edit-hours-${log.id}`}
                            type="number"
                            min="0"
                            step="0.5"
                            value={formData.hoursRequired}
                            onChange={(e) => setFormData({ ...formData, hoursRequired: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleUpdate(log)}
                            disabled={updateLogMutation.isPending}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updateLogMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button onClick={cancelEdit} variant="outline" className="flex-1">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{log.name}</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="inline-block px-2 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
                              {log.hoursRequired} hours required
                            </span>
                            <span className={`inline-block px-2 py-1 text-sm rounded-full ${
                              log.isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {log.isOpen ? 'Open' : 'Closed'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-gray-500">{log.isOpen ? 'Open' : 'Closed'}</Label>
                            <Switch
                              checked={log.isOpen}
                              onCheckedChange={() => handleToggleOpen(log)}
                            />
                          </div>
                          <Button variant="outline" size="sm" onClick={() => startEdit(log)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => deleteLogMutation.mutate(log.id)}
                            disabled={deleteLogMutation.isPending}
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
    </div>
  );
}
