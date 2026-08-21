import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { signInWithGoogle, signInWithEmail, createAccountWithEmail } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import logoImg from "@assets/image_1772414281666.png";
import { SiGoogle } from "react-icons/si";

type Mode = "sign-in" | "sign-up";

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

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setLoading(true);
      if (mode === "sign-in") {
        await signInWithEmail(email, password);
      } else {
        if (!name.trim()) {
          toast({ title: "Name required", description: "Please enter your name.", variant: "destructive" });
          return;
        }
        await createAccountWithEmail(email, password, name.trim());
      }
    } catch (err: any) {
      const msg =
        err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"
          ? "Incorrect email or password."
          : err.code === "auth/email-already-in-use"
          ? "An account with that email already exists."
          : err.code === "auth/weak-password"
          ? "Password must be at least 6 characters."
          : err.code === "auth/user-not-found"
          ? "No account found with that email."
          : err.message || "Authentication failed.";
      toast({ title: mode === "sign-in" ? "Sign-in failed" : "Sign-up failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f2e9] flex items-center justify-center px-4">
      {/* Subtle paper-grid texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
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
          <h1 className="text-2xl font-bold text-[#17324d]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            {mode === "sign-in" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-[#506477] text-sm mt-1">
            {mode === "sign-in" ? "Sign in to VolunteerClub" : "Join VolunteerClub today"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#faf8f4] border border-[#d9cdbd] rounded-2xl p-6 shadow-sm">
          {/* Google */}
          <Button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full bg-[#faf8f4] hover:bg-[#f7f2e9] text-[#17324d] font-medium h-11 rounded-xl flex items-center gap-3 mb-5 border border-[#d9cdbd] shadow-none"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-[#506477] border-t-transparent rounded-full animate-spin" />
            ) : (
              <SiGoogle className="w-4 h-4" />
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#d9cdbd]" />
            <span className="text-xs text-[#506477] uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-[#d9cdbd]" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === "sign-up" && (
              <div className="space-y-1.5">
                <Label className="text-sm text-[#506477]">Full name</Label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-[#faf8f4] border-[#d9cdbd] text-[#17324d] placeholder:text-[#b0a898] rounded-xl h-11 focus:border-[#506477] focus:ring-0"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm text-[#506477]">Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-[#faf8f4] border-[#d9cdbd] text-[#17324d] placeholder:text-[#b0a898] rounded-xl h-11 focus:border-[#506477] focus:ring-0"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-[#506477]">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "sign-up" ? "Min. 6 characters" : "••••••••"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-[#faf8f4] border-[#d9cdbd] text-[#17324d] placeholder:text-[#b0a898] rounded-xl h-11 pr-10 focus:border-[#506477] focus:ring-0"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#506477] hover:text-[#17324d]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-[#17324d] hover:bg-[#1e3f61] text-[#f7f2e9] font-semibold h-11 rounded-xl mt-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#f7f2e9]/50 border-t-[#f7f2e9] rounded-full animate-spin" />
              ) : mode === "sign-in" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </div>

        {/* Toggle mode */}
        <p className="text-center text-sm text-[#506477] mt-5">
          {mode === "sign-in" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setEmail(""); setPassword(""); setName(""); }}
            className="text-[#17324d] hover:underline font-semibold"
          >
            {mode === "sign-in" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
