import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, LogIn, Loader2, CalendarDays, AlertCircle, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  auth,
  getEventById,
  getUserMembership,
  getEventAttendance,
  checkInByQR,
  checkOutByQR,
  ClubEvent,
  EventAttendance,
} from "@/lib/firebase";
import { AuthPanel } from "@/components/auth-panel";
import { onAuthStateChanged } from "firebase/auth";

type Stage =
  | { type: 'loading' }
  | { type: 'event-not-found' }
  | { type: 'event-closed' }
  | { type: 'signin'; event?: ClubEvent }
  | { type: 'checking'; event: ClubEvent }
  | { type: 'not-member'; event: ClubEvent }
  | { type: 'processing'; event: ClubEvent; email: string }
  | { type: 'already-checked-in'; event: ClubEvent; record: EventAttendance }
  | { type: 'already-checked-out'; event: ClubEvent; record: EventAttendance }
  | { type: 'not-checked-in'; event: ClubEvent }
  | { type: 'success-checkin'; event: ClubEvent; record: EventAttendance }
  | { type: 'success-checkout'; event: ClubEvent; record: EventAttendance }
  | { type: 'error'; event?: ClubEvent; message: string };

function formatTime(d?: Date | string) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function EventCheckin() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get('eventId') || '';
  const action = (params.get('action') || 'checkin') as 'checkin' | 'checkout';

  // Start in signin stage (no event loaded yet) — load event only after auth
  const [stage, setStage] = useState<Stage>(eventId ? { type: 'signin' } : { type: 'event-not-found' });

  // Auth listener: when user signs in, move to 'loading' so we can fetch the event with auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setStage(prev => {
        if (prev.type === 'event-not-found' || prev.type === 'event-closed') return prev;
        if (prev.type === 'signin' && user) return { type: 'loading' };
        return prev;
      });
    });
    return () => unsub();
  }, []);

  // When stage becomes 'loading' (user is now authenticated), load the event
  useEffect(() => {
    if (stage.type !== 'loading') return;
    if (!eventId) { setStage({ type: 'event-not-found' }); return; }
    getEventById(eventId).then(event => {
      if (!event) return setStage({ type: 'event-not-found' });
      if (event.isOpen === false) return setStage({ type: 'event-closed' });
      setStage({ type: 'checking', event });
    }).catch(() => setStage({ type: 'event-not-found' }));
  }, [stage.type]);

  // When stage becomes 'checking', do membership check then act
  useEffect(() => {
    if (stage.type !== 'checking') return;
    const { event } = stage;
    const user = auth.currentUser;
    if (!user?.email) { setStage({ type: 'signin', event }); return; }

    const email = user.email;
    const clubId = event.clubId;

    const proceed = async () => {
      // Membership check — must belong to the event's club
      const requiredClubId = clubId || event.targetClubId;
      if (requiredClubId) {
        const mem = await getUserMembership(email);
        if (!mem || mem.membership.clubId !== requiredClubId) {
          return setStage({ type: 'not-member', event });
        }
      }

      setStage({ type: 'processing', event, email });

      // Check existing attendance
      const existing = await getEventAttendance(event.id);
      const myRecord = existing.find(a => a.userEmail === email);

      if (action === 'checkin') {
        if (myRecord && !myRecord.checkOutTime) {
          return setStage({ type: 'already-checked-in', event, record: myRecord });
        }
        const result = await checkInByQR(event.id, event.name, email, clubId);
        if (!result.success || !result.record) {
          return setStage({ type: 'error', event, message: result.message });
        }
        setStage({ type: 'success-checkin', event, record: result.record });
      } else {
        if (!myRecord) {
          return setStage({ type: 'not-checked-in', event });
        }
        if (myRecord.checkOutTime) {
          return setStage({ type: 'already-checked-out', event, record: myRecord });
        }
        const result = await checkOutByQR(event.id, email);
        if (!result.success) {
          return setStage({ type: 'error', event, message: result.message });
        }
        // Refetch record to get checkout time
        const updated = await getEventAttendance(event.id);
        const updatedRecord = updated.find(a => a.userEmail === email) || myRecord;
        setStage({ type: 'success-checkout', event, record: updatedRecord });
      }
    };

    proceed().catch(err => setStage({ type: 'error', event, message: err.message || 'An error occurred' }));
  }, [stage.type]);

  // Auth is now handled by AuthPanel inline

  const isCheckin = action === 'checkin';
  const accentColor = isCheckin ? 'green' : 'red';

  const headerBg = isCheckin
    ? 'bg-gradient-to-br from-green-500 to-green-600'
    : 'bg-gradient-to-br from-red-500 to-red-600';

  const renderBody = () => {
    if (stage.type === 'loading') {
      return (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          <p className="text-gray-500 text-sm">Loading event…</p>
        </div>
      );
    }

    if (stage.type === 'event-not-found') {
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="w-10 h-10 text-gray-400" />
          <p className="font-semibold text-gray-700">Event not found</p>
          <p className="text-sm text-gray-500">This QR code may be outdated or invalid.</p>
        </div>
      );
    }

    if (stage.type === 'event-closed') {
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <XCircle className="w-10 h-10 text-orange-400" />
          <p className="font-semibold text-gray-700">Check-in is closed</p>
          <p className="text-sm text-gray-500">The admin has paused attendance for this event.</p>
        </div>
      );
    }

    if (stage.type === 'signin') {
      return (
        <div className="py-4">
          <AuthPanel
            heading={`Sign in to ${isCheckin ? 'check in' : 'check out'}`}
            subheading="Sign in to record your attendance."
            allowSignUp={true}
          />
        </div>
      );
    }

    if (stage.type === 'checking' || stage.type === 'processing') {
      return (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          <p className="text-gray-500 text-sm">
            {stage.type === 'checking' ? 'Verifying membership…' : (isCheckin ? 'Checking you in…' : 'Checking you out…')}
          </p>
        </div>
      );
    }

    if (stage.type === 'not-member') {
      return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <UserX className="w-10 h-10 text-red-400" />
          <p className="font-semibold text-gray-700">Not a club member</p>
          <p className="text-sm text-gray-500">You must be a member of this club to attend this event.</p>
          <p className="text-xs text-gray-400">Signed in as: {auth.currentUser?.email}</p>
        </div>
      );
    }

    if (stage.type === 'not-checked-in') {
      return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="w-10 h-10 text-orange-400" />
          <p className="font-semibold text-gray-700">Not checked in yet</p>
          <p className="text-sm text-gray-500">You need to check in before you can check out.</p>
        </div>
      );
    }

    if (stage.type === 'already-checked-in') {
      return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <UserCheck className="w-10 h-10 text-green-500" />
          <p className="font-semibold text-gray-700">Already checked in</p>
          <p className="text-sm text-gray-500">You checked in at <strong>{formatTime(stage.record.checkInTime)}</strong>.</p>
          <p className="text-xs text-gray-400">Scan the check-out QR when you leave.</p>
        </div>
      );
    }

    if (stage.type === 'already-checked-out') {
      return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle className="w-10 h-10 text-blue-500" />
          <p className="font-semibold text-gray-700">Already checked out</p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>In: <strong>{formatTime(stage.record.checkInTime)}</strong></p>
            <p>Out: <strong>{formatTime(stage.record.checkOutTime)}</strong></p>
            {stage.record.minutesAttended != null && (
              <p>{stage.record.minutesAttended} minutes attended</p>
            )}
          </div>
        </div>
      );
    }

    if (stage.type === 'success-checkin') {
      return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-xl">You're checked in!</p>
            <p className="text-sm text-gray-500 mt-1">Checked in at <strong>{formatTime(stage.record.checkInTime)}</strong></p>
          </div>
          <div className="w-full max-w-xs bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            <p className="font-medium">{auth.currentUser?.displayName || auth.currentUser?.email}</p>
            <p className="text-xs text-green-600 mt-0.5">{auth.currentUser?.email}</p>
          </div>
          <p className="text-xs text-gray-400">Scan the check-out QR when you leave to record your time.</p>
        </div>
      );
    }

    if (stage.type === 'success-checkout') {
      const mins = stage.record.minutesAttended;
      const hrs = mins != null ? (mins / 60).toFixed(1) : null;
      return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-xl">Checked out!</p>
            <p className="text-sm text-gray-500 mt-1">See you next time.</p>
          </div>
          <div className="w-full max-w-xs bg-[#faf8f4] border border-[#d9cdbd] rounded-xl px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Arrived</span>
              <span className="font-medium">{formatTime(stage.record.checkInTime)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Left</span>
              <span className="font-medium">{formatTime(stage.record.checkOutTime)}</span>
            </div>
            {mins != null && (
              <div className="flex justify-between text-gray-700 font-semibold border-t border-[#d9cdbd] pt-1 mt-1">
                <span>Time attended</span>
                <span>{mins} min{hrs ? ` (${hrs}h)` : ''}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">The admin will review and grant hours based on your attendance.</p>
        </div>
      );
    }

    if (stage.type === 'error') {
      return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <XCircle className="w-10 h-10 text-red-400" />
          <p className="font-semibold text-gray-700">Something went wrong</p>
          <p className="text-sm text-gray-500">{stage.message}</p>
        </div>
      );
    }

    return null;
  };

  const eventName = 'event' in stage ? stage.event.name : null;

  return (
    <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#faf8f4] rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className={`${headerBg} px-6 py-5 text-white`}>
          <div className="flex items-center gap-2 mb-1">
            {isCheckin
              ? <CheckCircle className="w-5 h-5 text-green-100" />
              : <XCircle className="w-5 h-5 text-red-100" />}
            <span className="text-sm font-semibold text-white/80 uppercase tracking-wide">
              {isCheckin ? 'Check-In' : 'Check-Out'}
            </span>
          </div>
          {eventName && (
            <div className="flex items-start gap-2 mt-1">
              <CalendarDays className="w-4 h-4 text-white/70 mt-0.5 flex-shrink-0" />
              <p className="font-bold text-lg leading-snug">{eventName}</p>
            </div>
          )}
          {!eventName && stage.type !== 'loading' && (
            <p className="font-bold text-lg">VolunteerClub Event</p>
          )}
        </div>

        {/* Body */}
        <div className="px-6">
          {renderBody()}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 text-center">
          <p className="text-xs text-gray-400">VolunteerClub.io</p>
        </div>
      </div>
    </div>
  );
}
