import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  User,
  Club,
  getClubByInviteCode,
  getClubStats,
  getUserMembership,
  createMembership,
  signInWithGoogle,
  onAuthStateChanged,
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe,
  Lock,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  LogIn,
  Clock,
  ArrowRight,
  Trophy,
} from "lucide-react";
import logoImg from "@assets/image_1772414281666.png";

export default function ClubJoin() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged((u) => {
      setAuthUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const { data: club, isLoading: clubLoading, error: clubError } = useQuery<Club | null>({
    queryKey: ["club-by-invite", code],
    queryFn: () => getClubByInviteCode(code!),
    enabled: !!code,
  });

  const { data: clubStats } = useQuery({
    queryKey: ["club-stats-join", club?.id],
    queryFn: () => getClubStats(club!.id),
    enabled: !!club?.id,
  });

  const { data: userClubData, isLoading: membershipLoading } = useQuery({
    queryKey: ["user-membership-join", authUser?.email],
    queryFn: () => getUserMembership(authUser!.email),
    enabled: !!authUser?.email,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!club || !authUser) throw new Error("Not ready");
      if (club.isPrivate && club.password !== password) throw new Error("Incorrect password");
      return createMembership({
        clubId: club.id,
        userEmail: authUser.email,
        userName: authUser.name || authUser.email.split("@")[0],
        role: "member",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firebase-user-club"] });
      setJoined(true);
    },
    onError: (e: any) => {
      toast({ title: "Failed to join", description: e.message, variant: "destructive" });
    },
  });

  const isLoading = clubLoading || authLoading || (!!authUser && membershipLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (clubError || club === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 p-6">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center border border-red-100">
          <AlertCircle className="w-9 h-9 text-red-400" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Link not found</h1>
          <p className="text-gray-500 mt-2 max-w-xs text-sm leading-relaxed">
            This invite link is invalid or has been revoked. Ask the club admin for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center space-y-5">
          <div
            className="w-24 h-24 rounded-3xl border-4 border-white shadow-xl flex items-center justify-center overflow-hidden mx-auto"
            style={{ backgroundColor: club.color }}
          >
            {club.logoUrl
              ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
              : <Trophy className="w-12 h-12 text-white" />}
          </div>
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to {club.name}!</h1>
            <p className="text-gray-500 mt-1.5 text-sm">You're all set — start logging hours to earn territory.</p>
          </div>
          <Button
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-8 h-11"
            onClick={() => setLocation("/volunteer/dashboard")}
          >
            Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  const alreadyInThisClub = userClubData?.membership.clubId === club.id;
  const alreadyInAnotherClub = !!userClubData && userClubData.membership.clubId !== club.id;

  const bannerColor = club.color || "#111827";

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-2.5">
        <img src={logoImg} alt="VolunteerClub" className="h-7 w-auto" />
        <span className="font-semibold text-gray-900 text-sm tracking-tight">VolunteerClub.io</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">

            {/* Banner */}
            <div
              className="h-32 w-full relative"
              style={{
                background: `linear-gradient(135deg, ${bannerColor}cc 0%, ${bannerColor} 100%)`,
              }}
            >
              <div className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(circle at 70% 30%, white 0%, transparent 60%)",
                }} />
            </div>

            {/* Club identity */}
            <div className="px-6 pb-6 -mt-12">
              <div
                className="w-20 h-20 rounded-2xl border-[3px] border-white shadow-lg flex items-center justify-center overflow-hidden mb-4"
                style={{ backgroundColor: bannerColor }}
              >
                {club.logoUrl
                  ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                  : <Trophy className="w-10 h-10 text-white" />}
              </div>

              <h1 className="text-xl font-bold text-gray-900 leading-tight">{club.name}</h1>
              {club.description && (
                <p className="text-sm text-gray-500 mt-1 leading-relaxed line-clamp-2">{club.description}</p>
              )}

              {/* Stats row */}
              {clubStats && (
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    <span><strong className="text-gray-800 font-semibold">{clubStats.memberCount}</strong> members</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span><strong className="text-gray-800 font-semibold">{club.totalApprovedHours.toFixed(0)}</strong> hours logged</span>
                  </div>
                </div>
              )}

              {/* Privacy badge */}
              <div className="mt-3">
                {club.isPrivate
                  ? <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                      <Lock className="w-3 h-3" /> Password required
                    </span>
                  : <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                      <Globe className="w-3 h-3" /> Open to join
                    </span>}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 my-5" />

              {/* Action area */}
              <div className="space-y-4">
                {!authUser ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">Sign in to join</p>
                      <p className="text-xs text-gray-400 mt-0.5">You'll need a Google account to continue.</p>
                    </div>
                    <Button
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-11 font-medium"
                      onClick={() => signInWithGoogle()}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Continue with Google
                    </Button>
                  </div>

                ) : alreadyInThisClub ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-100 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800">You're already a member</p>
                        <p className="text-xs text-green-600 mt-0.5">Head to the dashboard to log hours.</p>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-11 font-medium"
                      onClick={() => setLocation("/volunteer/dashboard")}
                    >
                      Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                ) : alreadyInAnotherClub ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Already in another club</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          Leave your current club first before joining a new one.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl h-11 border-gray-200 font-medium"
                      onClick={() => setLocation("/volunteer/club")}
                    >
                      Go to My Club
                    </Button>
                  </div>

                ) : (
                  <div className="space-y-4">
                    {club.isPrivate && (
                      <div className="space-y-1.5">
                        <Label htmlFor="join-password" className="text-sm font-medium text-gray-700">
                          Club Password
                        </Label>
                        <Input
                          id="join-password"
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Enter password to join"
                          className="h-11 rounded-xl border-gray-200"
                          onKeyDown={e => e.key === "Enter" && joinMutation.mutate()}
                        />
                      </div>
                    )}
                    <Button
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-11 font-medium"
                      onClick={() => joinMutation.mutate()}
                      disabled={joinMutation.isPending || (club.isPrivate && !password)}
                    >
                      {joinMutation.isPending
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining…</>
                        : <>Join {club.name} <ArrowRight className="w-4 h-4 ml-2" /></>}
                    </Button>
                    <p className="text-xs text-gray-400 text-center">
                      Signed in as <span className="font-medium text-gray-600">{authUser.email}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-5">
            Powered by <span className="font-medium text-gray-500">VolunteerClub.io</span>
          </p>
        </div>
      </div>
    </div>
  );
}
