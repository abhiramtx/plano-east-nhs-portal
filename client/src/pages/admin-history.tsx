import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  getAllArchivedSubmissions,
  getCurrentUser,
  Club,
  HoursSubmission 
} from '@/lib/firebase';
import { 
  Calendar,
  Clock,
  User,
  Search,
  Download
} from 'lucide-react';

interface AdminHistoryProps {
  user?: { name: string; email: string };
  club: Club;
  isVolunteerView?: boolean;
}

export function AdminHistory({ user, club, isVolunteerView = false }: AdminHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const authUser = getCurrentUser();

  const { data: archivedData = [], isLoading } = useQuery({
    queryKey: ['firebase-archived-submissions', club.id],
    queryFn: () => getAllArchivedSubmissions(club.id),
    staleTime: 0,
    gcTime: 0,
  });

  // Filter to current user's submissions if on volunteer view
  const filteredData = archivedData.filter(item => {
    if (isVolunteerView) {
      // Volunteer only sees their own history - no search by other users
      return item.userEmail === authUser?.email;
    }
    
    // Admin can search by name, email, or archive period
    const matchesSearch = 
      item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.archivePeriod?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {isVolunteerView ? 'My History' : 'Archived Submissions'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isVolunteerView 
                  ? 'View your past submissions when data gets reset'
                  : `View archived submission history for ${club.name}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!isVolunteerView && (
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by volunteer name, email, or period..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No archived data found</p>
              <p className="text-sm text-gray-500 mt-1">
                {isVolunteerView
                  ? "Your historical data will appear here when submissions are archived"
                  : "Historical data will appear here when submissions are archived"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredData.map((submission) => (
              <Card key={submission.id} className="bg-white border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{submission.userName || submission.userEmail}</p>
                          <p className="text-sm text-gray-500">{submission.userEmail}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Activity</p>
                            <p className="text-sm text-gray-900 font-medium">{submission.activityName || submission.description}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Hours</p>
                            <p className="text-sm text-gray-900 font-medium">{submission.hours}h</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Date</p>
                            <p className="text-sm text-gray-900">{new Date(submission.date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Archive Period</p>
                            <p className="text-sm text-gray-900">{submission.archivePeriod}</p>
                          </div>
                        </div>
                      </div>

                      {submission.rejectReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                          <p className="text-xs font-medium text-red-700 uppercase mb-1">Rejection Reason</p>
                          <p className="text-sm text-red-600">{submission.rejectReason}</p>
                        </div>
                      )}

                      <div className="flex items-center space-x-4">
                        <Badge variant={submission.status === 'approved' ? 'default' : submission.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {submission.status}
                        </Badge>
                        {submission.reviewedBy && (
                          <p className="text-xs text-gray-500">
                            Reviewed by {submission.reviewedBy}
                            {submission.reviewedAt && ` on ${new Date(submission.reviewedAt).toLocaleDateString()}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
