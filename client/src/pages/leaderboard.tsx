import VolunteerMap from "@/pages/volunteer-map";
import { Club } from "@/lib/firebase";

export default function Leaderboard({ club }: { club: Club }) {
  return <VolunteerMap club={club} />;
}