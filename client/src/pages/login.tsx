import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { signInWithGoogle } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logoImg from "@assets/image_1772414281666.png";
import { SiGoogle } from "react-icons/si";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (auth.currentUser) {
      setLocation('/clubs');
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setLocation('/clubs');
    });
    return () => unsub();
  }, [setLocation]);

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      toast({
        title: "Google sign-in failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f2e9] flex items-center justify-center px-4">
      {/* Subtle paper-grid texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(#17324d 1px, transparent 1px), linear-gradient(90deg, #17324d 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Back button */}
        <button
          onClick={() => setLocation("/landing")}
          className="flex items-center gap-1.5 text-sm text-[#506477] hover:text-[#17324d] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-8">
          <img src={logoImg} alt="VolunteerClub" className="w-16 h-16 rounded-2xl mb-4 shadow-md" />
          <h1 className="text-2xl font-bold text-[#17324d]">Welcome back</h1>
          <p className="text-[#506477] text-sm mt-1">Sign in to VolunteerClub</p>
        </div>

        {/* Card */}
        <div className="bg-[#faf8f4] border border-[#d9cdbd] rounded-2xl p-6 shadow-sm">
          <Button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full bg-[#faf8f4] hover:bg-[#f7f2e9] text-[#17324d] font-medium h-11 rounded-xl flex items-center justify-center gap-3 border border-[#d9cdbd] shadow-none"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-[#506477] border-t-transparent rounded-full animate-spin" />
            ) : (
              <SiGoogle className="w-4 h-4" />
            )}
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
