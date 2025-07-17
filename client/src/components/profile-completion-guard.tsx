import { ReactNode } from "react";
import { User } from "@/lib/firebase";
import { useProfileCompletion } from "@/hooks/use-profile-completion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, User as UserIcon } from "lucide-react";
import { Link } from "wouter";

interface ProfileCompletionGuardProps {
  user: User | null;
  children: ReactNode;
}

export function ProfileCompletionGuard({ user, children }: ProfileCompletionGuardProps) {
  const { isProfileComplete, isLoading } = useProfileCompletion(user);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isProfileComplete) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="px-4 lg:px-6 py-4 lg:py-6 pt-16 lg:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Profile Required</h1>
                <p className="text-gray-600 mt-1">Complete your profile to access the application</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Complete Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Information Required</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  To use the Wylie NAHS Hours Tracker, you must complete all required profile information. 
                  This helps us track your service hours accurately and contact you when necessary.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Required Information:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Go-By First Name</li>
                    <li>• Last Name</li>
                    <li>• Student ID</li>
                    <li>• Personal Email Address</li>
                    <li>• Cell Phone Number</li>
                    <li>• Grade Level</li>
                  </ul>
                </div>
                <Link href="/student/profile">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
                    Complete Profile
                  </button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}