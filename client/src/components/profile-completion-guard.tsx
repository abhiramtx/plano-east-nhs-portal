import { ReactNode } from "react";
import { User } from "@/lib/firebase";
import { useProfileCompletion } from "@/hooks/use-profile-completion";
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Welcome to NAHS!</h3>
              <p className="text-blue-100">Let's set up your profile to get started</p>
            </div>
            
            {/* Content */}
            <div className="p-8 text-center">
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Complete Your Profile</h4>
                <p className="text-gray-600 leading-relaxed">
                  To access your dashboard and start tracking your art service hours, we need a few details about you first.
                </p>
              </div>
              
              {/* Features list */}
              <div className="space-y-3 mb-8 text-left">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">Track your service hours progress</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">Submit hours with proof attachments</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">Meet your 15-hour March requirement</span>
                </div>
              </div>
              
              {/* Action button */}
              <Link href="/student/profile" className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 font-medium shadow-lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Complete Profile Setup
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}