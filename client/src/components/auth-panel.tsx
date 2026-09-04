import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SiGoogle } from "react-icons/si";

interface AuthPanelProps {
  heading?: string;
  subheading?: string;
  onSignedIn?: () => void;
}

export function AuthPanel({
  heading = "Sign in to continue",
  subheading,
  onSignedIn,
}: AuthPanelProps) {
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
      onSignedIn?.();
    } catch (err: any) {
      toast({ title: "Google sign-in failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="text-center">
        <p className="font-semibold text-gray-900">{heading}</p>
        {subheading && <p className="text-sm text-gray-500 mt-0.5">{subheading}</p>}
      </div>

      <Button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full bg-black hover:bg-gray-800 text-white rounded-xl h-11 font-medium flex items-center justify-center gap-2"
      >
        {googleLoading
          ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          : <SiGoogle className="w-4 h-4" />}
        Continue with Google
      </Button>
    </div>
  );
}
