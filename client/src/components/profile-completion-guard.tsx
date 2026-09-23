import { ReactNode } from "react";
import { User } from "@/lib/firebase";
import { useProfileCompletion } from "@/hooks/use-profile-completion";
import { Link } from "wouter";
import logoImg from "@assets/image_1790127682492.png";

interface ProfileCompletionGuardProps {
  user: User | null;
  children: ReactNode;
}

export function ProfileCompletionGuard({
  user,
  children,
}: ProfileCompletionGuardProps) {
  const { isProfileComplete, isLoading } = useProfileCompletion(user);

  if (isLoading) {
    return (
      <div className="paper-grid flex min-h-screen items-center justify-center bg-background p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!isProfileComplete) {
    const checklist = [
      {
        label: "Track your service hours progress",
        border: "border-[#63a89a]/25",
        background: "bg-[#63a89a]/[0.08]",
        iconBackground: "bg-[#63a89a]/15",
        icon: "text-[#63a89a]",
      },
      {
        label: "Submit hours with proof attachments",
        border: "border-[#d7a85a]/25",
        background: "bg-[#d7a85a]/[0.08]",
        iconBackground: "bg-[#d7a85a]/15",
        icon: "text-[#d7a85a]",
      },
      {
        label: "Compete with clubs and claim territory",
        border: "border-[#d4785f]/25",
        background: "bg-[#d4785f]/[0.08]",
        iconBackground: "bg-[#d4785f]/15",
        icon: "text-[#d4785f]",
      },
    ];

    return (
      <div className="paper-grid flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
        <div className="w-full max-w-xl">
          <div className="overflow-hidden rounded-3xl border border-border/80 bg-card">
            <div className="relative border-b border-border/80 bg-gradient-to-br from-[#63a89a]/[0.06] via-card to-[#d4785f]/[0.06] px-6 pb-8 pt-10 text-center sm:px-10">
              <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-background/60 p-2">
                <img src={logoImg} alt="Plano East NHS" className="h-full w-full rounded-2xl object-cover" />
              </div>
              <h3 className="relative text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Welcome to Plano East NHS!
              </h3>
              <p className="relative mt-2 text-sm text-muted-foreground">
                Let's set up your profile to get started
              </p>
            </div>

            <div className="border-t border-border bg-card px-6 py-8 sm:px-10 sm:py-9">
              <div className="mx-auto max-w-md text-center">
                <div className="mb-7">
                  <h4 className="text-xl font-semibold tracking-tight text-foreground">
                    Complete Your Profile
                  </h4>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    To access your dashboard and start tracking your service hours, we need a few details about you first.
                  </p>
                </div>

                <div className="mb-8 border-y border-border/70 text-left">
                  {checklist.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 border-b border-border/70 py-3 last:border-b-0"
                    >
                      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center ${item.icon}`}>
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-foreground/90">{item.label}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/volunteer/profile"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d7a85a] px-6 py-3.5 font-semibold text-[#121212] transition-colors duration-200 hover:bg-[#e2b96e]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Complete Profile Setup
                </Link>
                <p className="mt-3 text-xs text-muted-foreground/70">It only takes a minute to get started.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
