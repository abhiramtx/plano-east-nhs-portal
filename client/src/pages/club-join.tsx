import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  User,
  Club,
  getClubByInviteCode,
  getUserMembership,
  createMembership,
  auth,
  signInWithGoogle,
  onAuthStateChanged,
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Lock, Users, CheckCircle, AlertCircle, Loader2, LogIn } from "lucide-react";
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
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (clubError || club === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Invite not found</h1>
        <p className="text-gray-500 text-center max-w-sm">
          This invite link is invalid or has been revoked. Ask the club admin for a new link.
        </p>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: club.color }}>
          {club.logoUrl
            ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
            : <Globe className="w-10 h-10 text-white" />}
        </div>
        <div className="text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">You joined {club.name}!</h1>
          <p className="text-gray-500 mt-1">Welcome to the team. Head to the app to start logging hours.</p>
        </div>
        <Button className="bg-black hover:bg-gray-800 text-white mt-2" onClick={() => setLocation("/volunteer/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const alreadyInThisClub = userClubData?.membership.clubId === club.id;
  const alreadyInAnotherClub = !!userClubData && userClubData.membership.clubId !== club.id;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <img src={logoImg} alt="VolunteerClub" className="h-8 w-auto" />
        <span className="font-semibold text-gray-900 text-sm">VolunteerClub.io</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm w-full max-w-sm overflow-hidden">
          <div className="h-24 w-full" style={{ backgroundColor: club.color + "33" }} />

          <div className="px-6 pb-6 -mt-10">
            <div
              className="w-20 h-20 rounded-2xl border-4 border-white shadow-md flex items-center justify-center overflow-hidden mb-4"
              style={{ backgroundColor: club.color }}
            >
              {club.logoUrl
                ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                : <Globe className="w-10 h-10 text-white" />}
            </div>

            <h1 className="text-xl font-bold text-gray-900">{club.name}</h1>
            {club.description && (
              <p className="text-sm text-gray-500 mt-1">{club.description}</p>
            )}

            <div className="flex items-center gap-2 mt-3">
              {club.isPrivate
                ? <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium"><Lock className="w-3 h-3" /> Password required</span>
                : <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium"><Users className="w-3 h-3" /> Open to join</span>}
            </div>

            <div className="mt-6 space-y-4">
              {!authUser ? (
                <>
                  <p className="text-sm text-gray-500 text-center">Sign in with Google to join this club.</p>
                  <Button
                    className="w-full bg-black hover:bg-gray-800 text-white"
                    onClick={() => signInWithGoogle()}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign in with Google
                  </Button>
                </>
              ) : alreadyInThisClub ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <p className="text-sm text-gray-700 font-medium">You're already a member of this club!</p>
                  <Button className="w-full bg-black hover:bg-gray-800 text-white mt-1" onClick={() => setLocation("/volunteer/dashboard")}>
                    Go to Dashboard
                  </Button>
                </div>
              ) : alreadyInAnotherClub ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">You're already in a club</p>
                    <p className="text-xs text-gray-500 mt-1">
                      You must leave your current club before joining a new one. Go to My Club in the app to leave.
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setLocation("/volunteer/club")}>
                    Go to My Club
                  </Button>
                </div>
              ) : (
                <>
                  {club.isPrivate && (
                    <div className="space-y-1">
                      <Label htmlFor="join-password">Club Password</Label>
                      <Input
                        id="join-password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter the club password"
                        onKeyDown={e => e.key === "Enter" && joinMutation.mutate()}
                      />
                    </div>
                  )}
                  <Button
                    className="w-full bg-black hover:bg-gray-800 text-white"
                    onClick={() => joinMutation.mutate()}
                    disabled={joinMutation.isPending || (club.isPrivate && !password)}
                  >
                    {joinMutation.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...</>
                      : `Join ${club.name}`}
                  </Button>
                  <p className="text-xs text-gray-400 text-center">
                    Signed in as <span className="font-medium">{authUser.email}</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
