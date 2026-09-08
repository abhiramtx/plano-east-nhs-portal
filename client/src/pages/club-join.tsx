import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  User,
  Club,
  ClubInviteSummary,
  auth,
  getClubByInviteCode,
  verifyClubInvitePassword,
  getClubStats,
  getUserMembershipSummary,
  createMembership,
  getUserProfile,
  getProfileDisplayName,
  clubSlug,
} from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { AuthPanel } from "@/components/auth-panel";
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

const QUOTES = [
  "The best way to find yourself is to lose yourself in the service of others.",
  "Volunteers don't get paid, not because they're worthless, but because they're priceless.",
  "No act of kindness, however small, is ever wasted.",
  "We rise by lifting others.",
  "The meaning of life is to find your gift. The purpose of life is to give it away.",
  "Service to others is the rent you pay for your room here on Earth.",
  "In every community, there is work to be done.",
  "Alone we can do so little; together we can do so much.",
];

function QuoteRotator() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 600);
    }, 4000);
    return () => clearInterval(cycle);
  }, []);

  return (
    <div className="flex h-24 w-full max-w-sm items-center justify-center rounded-2xl border border-border bg-card px-6">
      <p
        className="max-w-xs text-center text-sm italic leading-relaxed text-muted-foreground transition-opacity duration-500"
        style={{ opacity: visible ? 1 : 0 }}
      >
        "{QUOTES[index]}"
      </p>
    </div>
  );
}

export default function ClubJoin() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    // Use native Firebase auth so we get the resolved state even when the
    // app-level initializeAuth hasn't been called (early-return /join path).
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser || !fbUser.email) {
        setAuthUser(null);
      } else {
        setAuthUser({
          email: fbUser.email,
          name: fbUser.displayName || fbUser.email.split('@')[0],
          photoURL: fbUser.photoURL || undefined,
          uid: fbUser.uid,
        });
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const { data: club, isLoading: clubLoading, error: clubError } = useQuery<ClubInviteSummary | null>({
    queryKey: ["club-by-invite", code],
    queryFn: () => getClubByInviteCode(code!),
    enabled: !!code && !!authUser,
  });

  const { data: clubStats } = useQuery({
    queryKey: ["club-stats-join", club?.id],
    queryFn: () => getClubStats(club!.id),
    enabled: !!club?.id,
  });

  const { data: userMemberships = [], isLoading: membershipLoading } = useQuery({
    queryKey: ["user-membership-join", authUser?.email],
    queryFn: () => getUserMembershipSummary(authUser!.email),
    enabled: !!authUser?.email,
  });

  const { data: profile } = useQuery({
    queryKey: ["user-profile-join", authUser?.email],
    queryFn: () => getUserProfile(authUser!.email),
    enabled: !!authUser?.email,
    staleTime: 60000,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!club || !authUser) throw new Error("Not ready");
      if (club.isPrivate) {
        await verifyClubInvitePassword(code!, password);
      }
      return createMembership({
        clubId: club.id,
        userEmail: authUser.email,
        userName: getProfileDisplayName(profile, authUser.email),
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

  const pageShell = (children: React.ReactNode) => (
    <div className="paper-grid min-h-screen bg-[#121212] flex flex-col">
      <header className="px-6 py-4 flex items-center gap-2.5">
        <img src={logoImg} alt="VolunteerClub" className="h-7 w-auto" />
        <span className="font-semibold text-white text-sm tracking-tight">VolunteerClub.io</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-5">
        <QuoteRotator />
        {children}
      </div>
    </div>
  );

  if (isLoading) {
    return pageShell(
      <div className="bg-[#faf8f4] border border-border rounded-2xl shadow-xl w-full max-w-sm p-10 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (!authUser) {
    return pageShell(
      <div className="bg-[#faf8f4] border border-border rounded-2xl shadow-xl w-full max-w-sm p-8">
        <AuthPanel
          heading="Sign in to join"
          subheading="Sign in to view and join this club."
        />
      </div>
    );
  }

  if (clubError || club === null) {
    return pageShell(
      <div className="bg-[#faf8f4] border border-border rounded-2xl shadow-xl w-full max-w-sm p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 bg-[#faf8f4] rounded-2xl flex items-center justify-center border border-[#d9cdbd]">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Link not found</h1>
          <p className="text-gray-400 mt-1.5 text-sm leading-relaxed">
            This invite link is invalid or has been revoked. Ask your club admin for a new one.
          </p>
        </div>
      </div>
    );
  }

  if (joined) {
    return pageShell(
      <div className="bg-[#faf8f4] border border-border rounded-2xl shadow-xl w-full max-w-sm p-10 flex flex-col items-center gap-5 text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden border border-[#d9cdbd]"
          style={{ backgroundColor: club.color || "#111827" }}
        >
          {club.logoUrl
            ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
            : <Trophy className="w-10 h-10 text-white" />}
        </div>
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Welcome to {club.name}!</h1>
          <p className="text-gray-400 mt-1 text-sm">Start logging hours to earn territory for your club.</p>
        </div>
        <Button
          className="w-full bg-black hover:bg-gray-900 text-white rounded-xl h-11 font-medium"
          onClick={() => setLocation(`/${clubSlug(club.name)}/volunteer/dashboard`)}
        >
          Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  const alreadyInThisClub = userMemberships.some(membership => membership.clubId === club.id);
  const alreadyInAnotherClub = userMemberships.length > 0 && !alreadyInThisClub;

  return pageShell(
    <div className="bg-[#faf8f4] border border-border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
      <div className="p-7 flex flex-col items-center text-center gap-4">

        {/* Logo */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm border border-[#d9cdbd]"
          style={{ backgroundColor: club.color || "#111827" }}
        >
          {club.logoUrl
            ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
            : <Trophy className="w-10 h-10 text-white" />}
        </div>

        {/* Identity */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{club.name}</h1>
          {club.description && (
            <p className="text-sm text-gray-400 mt-1 leading-relaxed line-clamp-2">{club.description}</p>
          )}
        </div>

        {/* Stats */}
        {clubStats && (
          <div className="flex items-center gap-5 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span><strong className="text-gray-700 font-semibold">{clubStats.memberCount}</strong> members</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span><strong className="text-gray-700 font-semibold">{club.totalApprovedHours.toFixed(0)}</strong> hours</span>
            </div>
          </div>
        )}

        {/* Privacy badge */}
        <div>
          {club.isPrivate
            ? <span className="inline-flex items-center gap-1.5 text-xs bg-[#faf8f4] text-gray-500 border border-[#d9cdbd] px-2.5 py-1 rounded-full font-medium">
                <Lock className="w-3 h-3" /> Password required
              </span>
            : <span className="inline-flex items-center gap-1.5 text-xs bg-[#faf8f4] text-gray-500 border border-[#d9cdbd] px-2.5 py-1 rounded-full font-medium">
                <Globe className="w-3 h-3" /> Open to join
              </span>}
        </div>

        <div className="w-full border-t border-[#d9cdbd]" />

        {/* Action */}
        <div className="w-full space-y-3">
          {!authUser ? (
            <AuthPanel
              heading="Sign in to join this club"
              subheading={undefined}
            />

          ) : alreadyInThisClub ? (
            <>
              <div className="flex items-center gap-2.5 p-3 bg-[#faf8f4] border border-[#d9cdbd] rounded-xl text-left">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-gray-700 font-medium">You're already a member</p>
              </div>
              <Button
                className="w-full bg-black hover:bg-gray-900 text-white rounded-xl h-11 font-medium"
                onClick={() => setLocation(`/${clubSlug(club.name)}/volunteer/dashboard`)}
              >
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>

          ) : alreadyInAnotherClub ? (
            <>
              <div className="flex items-start gap-2.5 p-3 bg-[#faf8f4] border border-[#d9cdbd] rounded-xl text-left">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Already in another club</p>
                  <p className="text-xs text-gray-400 mt-0.5">Leave your current club first.</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full rounded-xl h-11 border-[#d9cdbd] font-medium"
                onClick={() => setLocation(`/${clubSlug(club.name)}/volunteer/club`)}
              >
                Go to My Club
              </Button>
            </>

          ) : (
            <>
              {club.isPrivate && (
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="join-password" className="text-sm font-medium text-gray-700">
                    Club Password
                  </Label>
                  <Input
                    id="join-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="h-11 rounded-xl border-[#d9cdbd]"
                    onKeyDown={e => e.key === "Enter" && joinMutation.mutate()}
                  />
                </div>
              )}
              <Button
                className="w-full bg-black hover:bg-gray-900 text-white rounded-xl h-11 font-medium"
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending || (club.isPrivate && !password)}
              >
                {joinMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining…</>
                  : <>Join {club.name} <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
              <p className="text-xs text-gray-400">
                Signed in as <span className="font-medium text-gray-600">{authUser.email}</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
