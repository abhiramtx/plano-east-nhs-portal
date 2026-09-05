import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { onAuthStateChanged } from "firebase/auth";
import { SiGoogle } from "react-icons/si";
import { auth, signInWithGoogle } from "@/lib/firebase";

interface LandingProps {
  onSignIn: () => void;
}

function Landing({ onSignIn }: LandingProps) {
  const [, setLocation] = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setLocation("/clubs");
    });
    return () => unsubscribe();
  }, [setLocation]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      onSignIn();
      const signedInUser = await signInWithGoogle();
      if (signedInUser) setLocation("/clubs");
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setIsSigningIn(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#121212] px-5 text-[#f3efe6]">
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col">
        <header className="flex items-center justify-between border-b border-[#343731] py-5">
          <span className="text-base font-semibold tracking-[-0.02em]">
            VolunteerClub
          </span>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#4a4b45] bg-[#f3efe6] px-4 text-sm font-semibold text-[#121212] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-70"
          >
            {isSigningIn ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#121212]/30 border-t-[#121212]" />
            ) : (
              <SiGoogle className="h-4 w-4" />
            )}
            {isSigningIn ? "Signing in..." : "Continue with Google"}
          </button>
        </header>

        <section className="flex flex-1 items-start py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#63a89a]">
              A shared record of showing up
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
              VolunteerClub
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#a8aa9f] sm:text-xl">
              VolunteerClub gives student service clubs one calm place to plan events, approve hours, and see the shape of their work in the community.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Landing;