import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/firebase";

// Helper function to convert email to storage key
const emailToKey = (email: string) => email.replace(/\./g, ',');

export function useProfileCompletion(user: User | null) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/user-profile', user?.email ? emailToKey(user.email) : ''],
    enabled: !!user?.email,
  });

  const isProfileComplete = profile && 
    profile.goByFirstName && 
    profile.goByFirstName.trim() !== '' &&
    profile.lastName && 
    profile.lastName.trim() !== '' &&
    profile.studentId && 
    profile.studentId.trim() !== '' &&
    profile.personalEmailAddress && 
    profile.personalEmailAddress.trim() !== '' &&
    profile.cellPhoneNumber && 
    profile.cellPhoneNumber.trim() !== '' &&
    profile.gradeLevel && 
    profile.gradeLevel.trim() !== '';

  return {
    profile,
    isProfileComplete: !!isProfileComplete,
    isLoading
  };
}