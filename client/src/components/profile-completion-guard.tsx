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
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-black/20">
            <div className="absolute inset-x-0 top-0 z-10 h-1.5 bg-gradient-to-r from-[#63a89a] via-[#d7a85a] to-[#d4785f]" />

            <div className="relative overflow-hidden bg-gradient-to-br from-[#63a89a]/15 via-[#d7a85a]/10 to-[#d4785f]/15 px-6 pb-8 pt-10 text-center sm:px-10">
              <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#d7a85a]/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-[#63a89a]/10 blur-2xl" />
              <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#d7a85a]/35 bg-[#121212]/90 p-2 shadow-lg shadow-[#d7a85a]/10">
                <img src={logoImg} alt="Plano East NHS" className="h-full w-full rounded-2xl object-cover" />
              </div>
              <p className="relative mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d7a85a]">
                Welcome
              </p>
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
                  <div className="mb-3 inline-flex items-center rounded-full border border-[#d7a85a]/25 bg-[#d7a85a]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d7a85a]">
                    Your next step
                  </div>
                  <h4 className="text-xl font-semibold tracking-tight text-foreground">
                    Complete Your Profile
                  </h4>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    To access your dashboard and start tracking your service hours, we need a few details about you first.
                  </p>
                </div>

                <div className="mb-8 space-y-2.5 text-left">
                  {checklist.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${item.border} ${item.background}`}
                    >
                      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${item.iconBackground} ${item.icon}`}>
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#d7a85a] px-6 py-3.5 font-semibold text-[#121212] transition-all duration-200 hover:bg-[#e2b96e] hover:shadow-lg hover:shadow-[#d7a85a]/15"
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
