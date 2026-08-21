import { useState } from "react";
import { signInWithGoogle, signInWithEmail, createAccountWithEmail } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { SiGoogle } from "react-icons/si";

interface AuthPanelProps {
  heading?: string;
  subheading?: string;
  allowSignUp?: boolean;
  onSignedIn?: () => void;
}

export function AuthPanel({
  heading = "Sign in to continue",
  subheading,
  allowSignUp = true,
  onSignedIn,
}: AuthPanelProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
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

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setEmailLoading(true);
      if (mode === "sign-in") {
        await signInWithEmail(email, password);
      } else {
        if (!name.trim()) {
          toast({ title: "Name required", description: "Please enter your name.", variant: "destructive" });
          return;
        }
        await createAccountWithEmail(email, password, name.trim());
      }
      onSignedIn?.();
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
      setEmailLoading(false);
    }
  };

  const loading = emailLoading || googleLoading;

  const reset = () => { setEmail(""); setPassword(""); setName(""); };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="text-center">
        <p className="font-semibold text-gray-900">{heading}</p>
        {subheading && <p className="text-sm text-gray-500 mt-0.5">{subheading}</p>}
      </div>

      {/* Google */}
      <Button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full bg-black hover:bg-gray-800 text-white rounded-xl h-11 font-medium flex items-center gap-2"
      >
        {googleLoading
          ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          : <SiGoogle className="w-4 h-4" />}
        Continue with Google
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Email / password */}
      <form onSubmit={handleEmail} className="flex flex-col gap-3">
        {mode === "sign-up" && (
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="rounded-xl h-11 border-[#d9cdbd] text-sm"
            autoComplete="name"
          />
        )}
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="rounded-xl h-11 border-[#d9cdbd] text-sm"
          autoComplete="email"
          required
        />
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder={mode === "sign-up" ? "Password (min. 6 chars)" : "Password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="rounded-xl h-11 border-[#d9cdbd] text-sm pr-10"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-black hover:bg-gray-800 text-white rounded-xl h-11 font-medium"
        >
          {emailLoading
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : mode === "sign-in" ? "Sign In" : "Create Account"}
        </Button>
      </form>

      {allowSignUp && (
        <p className="text-center text-xs text-gray-400">
          {mode === "sign-in" ? "No account?" : "Already have one?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); reset(); }}
            className="text-gray-700 font-medium hover:underline"
          >
            {mode === "sign-in" ? "Sign up" : "Sign in"}
          </button>
        </p>
      )}
    </div>
  );
}
