import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { onAuthStateChanged } from "firebase/auth";
import { SiGoogle } from "react-icons/si";
import { auth, signInWithGoogle } from "@/lib/firebase";
import logoImg from "@assets/image_1790127682492.png";

interface LandingProps {
  onSignIn: () => void;
}

function Landing({ onSignIn }: LandingProps) {
  const [, setLocation] = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setLocation("/volunteer/dashboard");
    });
    return () => unsubscribe();
  }, [setLocation]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setSignInError(null);
      onSignIn();
      const signedInUser = await signInWithGoogle();
      if (signedInUser) setLocation("/volunteer/dashboard");
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setSignInError("Google sign-in could not be completed. Please try again.");
      setIsSigningIn(false);
    }
  };

  return (
    <main className="paper-grid min-h-[100dvh] bg-[#121212] px-5 text-[#f3efe6]">
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col">
        <header className="flex items-center justify-between border-b border-[#343731] py-5">
          <div className="flex items-center gap-2.5">
            <img
              src={logoImg}
              alt=""
              className="h-8 w-8 rounded-lg object-cover"
            />
            <span className="text-base font-semibold tracking-[-0.02em]">
              Plano East NHS
            </span>
          </div>
          <div className="flex flex-col items-end">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              aria-label={isSigningIn ? "Signing in" : "Continue with Google"}
              title="Continue with Google"
              className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-full border border-[#4a4b45] bg-[#f3efe6] px-0 text-sm font-semibold text-[#121212] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:justify-start sm:px-4"
            >
              {isSigningIn ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#121212]/30 border-t-[#121212]" />
              ) : (
                <SiGoogle className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{isSigningIn ? "Signing in..." : "Continue with Google"}</span>
            </button>
            {signInError && (
              <p className="mt-3 max-w-xs text-right text-xs leading-5 text-[#d4785f]">
                {signInError}
              </p>
            )}
          </div>
        </header>

        <section className="flex flex-1 items-start py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#63a89a]">
              A <span className="text-[#d4785f]">shared</span> record of showing up
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-[#d7a85a] sm:text-7xl lg:text-8xl">
              Plano East NHS
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#a8aa9f] sm:text-xl">
              The Plano East National Honor Society portal gives students one calm place to log service, join events, and see the impact of their work in the community.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Landing;