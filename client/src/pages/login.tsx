import { useState } from "react";
import { useLocation } from "wouter";
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
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)", filter: "blur(80px)" }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)", filter: "blur(80px)" }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Back button */}
        <button
          onClick={() => setLocation("/landing")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-8">
          <img src={logoImg} alt="VolunteerClub" className="w-16 h-16 rounded-2xl mb-4 shadow-2xl" />
          <h1 className="text-2xl font-bold text-white">
            {mode === "sign-in" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === "sign-in" ? "Sign in to VolunteerClub" : "Join VolunteerClub today"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          {/* Google */}
          <Button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium h-11 rounded-xl flex items-center gap-3 mb-5"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <SiGoogle className="w-4 h-4" />
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-600 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === "sign-up" && (
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-400">Full name</Label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-gray-600 rounded-xl h-11 focus:border-white/30 focus:ring-0"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm text-gray-400">Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-gray-600 rounded-xl h-11 focus:border-white/30 focus:ring-0"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-gray-400">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "sign-up" ? "Min. 6 characters" : "••••••••"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-gray-600 rounded-xl h-11 pr-10 focus:border-white/30 focus:ring-0"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold h-11 rounded-xl mt-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : mode === "sign-in" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </div>

        {/* Toggle mode */}
        <p className="text-center text-sm text-gray-600 mt-5">
          {mode === "sign-in" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setEmail(""); setPassword(""); setName(""); }}
            className="text-white hover:underline font-medium"
          >
            {mode === "sign-in" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
