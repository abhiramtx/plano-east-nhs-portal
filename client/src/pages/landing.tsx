import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { signInWithGoogle, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Trophy, MapPin, ArrowRight, Zap, Shield, Target, ChevronDown, Sparkles,
  Globe, Clock, QrCode, BookOpen, Award, BarChart3, ScanLine,
  Lock, CheckCircle, Calendar, Map, Star, Layers
} from "lucide-react";
import logoImg from "@assets/image_1772414281666.png";
import { Button } from "@/components/ui/button";
import MapGL from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

interface LandingProps {
  onSignIn: () => void;
}

function useScrollAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);
  return { ref, isVisible };
}

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, delay = 0 }: {
  icon: any; title: string; desc: string; color: string; delay?: number;
}) {
  return (
    <AnimatedSection delay={delay}>
      <div className="group p-7 rounded-3xl bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-all duration-500 h-full">
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </AnimatedSection>
  );
}

function GlowOrb({ color, size, position, animation }: { color: string; size: string; position: string; animation: string }) {
  return (
    <div
      className={`absolute ${size} ${position} rounded-full pointer-events-none ${animation}`}
      style={{ background: color, filter: 'blur(80px)', opacity: 0.45 }}
    />
  );
}

export default function Landing({ onSignIn }: LandingProps) {
  const [loading, setLoading] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isSignedIn, setIsSignedIn] = useState(!!auth.currentUser);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setIsSignedIn(!!user));
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = 'auto'; };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: "Sign-in failed",
        description: error.message || "Authentication failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="bg-black text-white overflow-x-hidden" style={{ minHeight: '100vh' }}>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 50 ? 'bg-black/90 backdrop-blur-lg border-b border-white/10' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => scrollTo('hero')}>
              <img src={logoImg} alt="VolunteerClub" className="w-10 h-10 rounded-xl" />
              <span className="text-xl font-bold text-white">VolunteerClub</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollTo('features')} className="text-gray-400 hover:text-white transition-colors text-sm">Features</button>
              <button onClick={() => scrollTo('events')} className="text-gray-400 hover:text-white transition-colors text-sm">Events</button>
              <button onClick={() => scrollTo('how-it-works')} className="text-gray-400 hover:text-white transition-colors text-sm">How It Works</button>
            </div>
            {isSignedIn ? (
              <button
                onClick={() => setLocation('/')}
                className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105"
              >
                Go to App
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section id="hero" className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <GlowOrb color="radial-gradient(circle, rgba(59,130,246,0.7) 0%, transparent 70%)" size="w-[500px] h-[500px]" position="top-[10%] left-[5%]" animation="animate-float-slow" />
        <GlowOrb color="radial-gradient(circle, rgba(168,85,247,0.6) 0%, transparent 70%)" size="w-[400px] h-[400px]" position="bottom-[10%] right-[8%]" animation="animate-float-medium" />
        <GlowOrb color="radial-gradient(circle, rgba(34,197,94,0.5) 0%, transparent 70%)" size="w-[300px] h-[300px]" position="top-[45%] right-[25%]" animation="animate-float-fast" />
        <GlowOrb color="radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)" size="w-[250px] h-[250px]" position="bottom-[35%] left-[20%]" animation="animate-float-medium" />

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-8">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white/80">Gamify Your Impact</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight leading-tight">
            Volunteer.<br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
              Conquer Territory.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Join clubs, log service hours, and watch your influence expand across the globe.
            Every hour you volunteer grows your territory on a live world map.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={isSignedIn ? () => setLocation('/') : handleGoogleSignIn}
              disabled={loading}
              className="group flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] disabled:opacity-50"
            >
              {isSignedIn ? "Go to App" : loading ? "Signing in..." : "Get Started Free"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => scrollTo('features')}
              className="flex items-center gap-3 px-8 py-4 bg-transparent border border-white/20 text-white font-semibold rounded-full hover:bg-white/5 hover:border-white/40 transition-all duration-300"
            >
              <Globe className="w-5 h-5" />
              See Features
            </button>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 flex-wrap">
            {[
              { label: 'Territory Growth', value: 'Per Location' },
              { label: 'Event Types', value: '4 Modes' },
              { label: 'Club Roles', value: 'Admin & Member' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-sm text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => scrollTo('features')} className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-gray-600" />
        </button>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-4 relative">
        <GlowOrb color="radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)" size="w-[450px] h-[450px]" position="top-[10%] right-[5%]" animation="" />

        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">Everything You Need</span>
            <h2 className="text-4xl md:text-6xl font-bold mt-4 mb-5 text-white">
              Built for <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Serious Clubs</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              From territory mechanics to event management, every feature is designed to make volunteering more engaging and trackable.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={MapPin}
              title="Territory That Grows"
              desc="Every approved submission expands your club's circles on the world map. Circles grow logarithmically at each location — volunteer more at one spot to push it further. When circles from the same club overlap, they merge with smooth metaball blending."
              color="bg-gradient-to-br from-blue-500 to-blue-600"
              delay={0}
            />
            <FeatureCard
              icon={Users}
              title="Club System"
              desc="Create a public or password-protected club. Assign members as admins for multi-admin approval workflows. Club hours, territory, and leaderboard ranking all update automatically as members submit and get approved."
              color="bg-gradient-to-br from-purple-500 to-purple-600"
              delay={80}
            />
            <FeatureCard
              icon={Trophy}
              title="Global Leaderboards"
              desc="See where your club ranks globally. Leaderboards update in real-time as hours are approved. Territory size on the map reflects your standing — the more hours, the more of the world you control."
              color="bg-gradient-to-br from-yellow-500 to-orange-500"
              delay={160}
            />
            <FeatureCard
              icon={BookOpen}
              title="Hours Logs"
              desc="Create named tracking periods like 'Fall Semester' or 'Summer 2026' with hour requirements. Volunteers submit hours to specific logs. Admins see per-log progress and can export to CSV to see who has met requirements."
              color="bg-gradient-to-br from-teal-500 to-cyan-600"
              delay={240}
            />
            <FeatureCard
              icon={Award}
              title="Admin Grant & Approve"
              desc="Admins can approve or reject submissions with optional multi-admin thresholds. Grant hours directly to volunteers for special occasions — tagged 'Granted by Admin' for transparency. Inline hour editing too."
              color="bg-gradient-to-br from-green-500 to-green-600"
              delay={320}
            />
            <FeatureCard
              icon={Layers}
              title="Decay System"
              desc="Territory isn't permanent — circles decay slowly when a location goes inactive, keeping competition fresh. Configure decay rate, minimum floor, and bonus multipliers for high-need areas in your admin settings."
              color="bg-gradient-to-br from-red-500 to-pink-600"
              delay={400}
            />
          </div>
        </div>
      </section>

      {/* ── EVENTS ──────────────────────────────────────────────────── */}
      <section id="events" className="py-28 px-4 relative">
        <GlowOrb color="radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)" size="w-[500px] h-[500px]" position="bottom-[5%] left-[5%]" animation="" />

        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">Event Management</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-5 text-white">Four Ways to Run Events</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Every event type is purpose-built for how check-ins actually work in the field.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {[
              {
                icon: Globe,
                color: 'from-green-500 to-emerald-600',
                label: 'Open',
                bg: 'bg-green-500/10 border-green-500/20',
                title: 'Open Events',
                desc: 'No check-in required. Volunteers submit hours freely after attending. Perfect for ongoing community service with no central coordinator.',
              },
              {
                icon: Lock,
                color: 'from-yellow-500 to-amber-600',
                label: 'Password Protected',
                bg: 'bg-yellow-500/10 border-yellow-500/20',
                title: 'Password Events',
                desc: 'Organizers share a code that volunteers enter when submitting. Prevents unauthorized hour submissions without requiring face-to-face check-in.',
              },
              {
                icon: ScanLine,
                color: 'from-blue-500 to-blue-600',
                label: 'Scan QR',
                bg: 'bg-blue-500/10 border-blue-500/20',
                title: 'Admin Scans You',
                desc: 'Each volunteer has a personal QR code on their profile. An organizer scans it at arrival (check-in) and departure (check-out). Time is recorded automatically.',
              },
              {
                icon: QrCode,
                color: 'from-purple-500 to-purple-600',
                label: 'Show QR',
                bg: 'bg-purple-500/10 border-purple-500/20',
                title: 'You Scan the Event',
                desc: 'The organizer displays a QR code at the venue. Volunteers scan it to check in and out. Great for large events with many simultaneous arrivals.',
              },
            ].map((ev) => (
              <AnimatedSection key={ev.title} delay={0}>
                <div className={`p-7 rounded-3xl border ${ev.bg} transition-all duration-300 hover:scale-[1.01] h-full`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${ev.color} rounded-xl flex items-center justify-center`}>
                      <ev.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full border ${ev.bg}`}>{ev.label}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{ev.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{ev.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection>
            <div className="p-8 rounded-3xl bg-white/[0.04] border border-white/10">
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400 uppercase tracking-wide">Time-Based Hours</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Automatic Hour Calculation</h3>
                  <p className="text-gray-400 leading-relaxed mb-6">
                    For QR events, check-in and check-out times are recorded to the minute. Admins can use <strong className="text-white">conditionals</strong> — rules like "attended more than 1.5 hours → grant 2 hours" or "attended less than 30 minutes → grant 0" — to automatically compute hours when granting.
                  </p>
                  <div className="space-y-3">
                    {[
                      'Check-in and check-out timestamps stored per attendee',
                      'Conditional rules: less than / exactly / more than X hours → grant Y',
                      'Per-person override if someone needs a custom amount',
                      'Grant to all attendees or select individuals',
                    ].map(item => (
                      <div key={item} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-full lg:w-80 flex-shrink-0">
                  <div className="bg-black/40 rounded-2xl border border-white/10 p-5 font-mono text-sm space-y-3">
                    <div className="flex justify-between text-gray-400 text-xs uppercase tracking-wide border-b border-white/10 pb-2">
                      <span>Volunteer</span>
                      <span>Duration</span>
                      <span>Hours</span>
                    </div>
                    {[
                      { name: 'Alex R.', duration: '2h 14m', hours: '2.0', color: 'text-green-400' },
                      { name: 'Jordan K.', duration: '1h 52m', hours: '2.0', color: 'text-green-400' },
                      { name: 'Sam T.', duration: '0h 28m', hours: '0', color: 'text-red-400' },
                      { name: 'Morgan L.', duration: '3h 05m', hours: '3.0', color: 'text-green-400' },
                    ].map(row => (
                      <div key={row.name} className="flex justify-between items-center">
                        <span className="text-white">{row.name}</span>
                        <span className="text-gray-400">{row.duration}</span>
                        <span className={row.color}>{row.hours} hrs</span>
                      </div>
                    ))}
                    <div className="border-t border-white/10 pt-2 text-xs text-gray-500">
                      Conditional: ≥1.5h → 2hrs granted
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── TERRITORY ───────────────────────────────────────────────── */}
      <section className="py-28 px-4 relative">
        <GlowOrb color="radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)" size="w-[500px] h-[500px]" position="top-[10%] left-[5%]" animation="" />

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection delay={200}>
              <div className="relative">
                <div className="aspect-[4/3] rounded-3xl bg-black border border-white/10 overflow-hidden">
                  <MapGL
                    initialViewState={{ longitude: -98, latitude: 38, zoom: 3 }}
                    mapStyle={MAP_STYLE}
                    style={{ width: '100%', height: '100%' }}
                    attributionControl={false}
                    interactive={false}
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[40%] left-[30%] w-32 h-32 rounded-full border-2 border-blue-500/50 bg-blue-500/10 animate-pulse" />
                    <div className="absolute top-[35%] left-[38%] w-20 h-20 rounded-full border-2 border-blue-500/60 bg-blue-500/15 animate-pulse" style={{ animationDelay: '0.3s' }} />
                    <div className="absolute top-[55%] left-[60%] w-24 h-24 rounded-full border-2 border-green-500/50 bg-green-500/10 animate-pulse" style={{ animationDelay: '0.7s' }} />
                    <div className="absolute top-[30%] left-[55%] w-16 h-16 rounded-full border-2 border-purple-500/50 bg-purple-500/10 animate-pulse" style={{ animationDelay: '1.1s' }} />
                    <div className="absolute top-[65%] left-[25%] w-12 h-12 rounded-full border-2 border-yellow-500/60 bg-yellow-500/15 animate-pulse" style={{ animationDelay: '0.5s' }} />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Target className="w-10 h-10 text-white" />
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">Territory Mechanics</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-white">
                Your Hours Shape <br className="hidden md:block" />the Map
              </h2>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Each hour submission can include a location. Territory circles grow independently at each spot based on how many hours have been logged there — not globally.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: MapPin, label: 'Base Radius', val: '4 miles', color: 'text-blue-400' },
                  { icon: Zap, label: 'Max Radius', val: '20 miles', color: 'text-yellow-400' },
                  { icon: BarChart3, label: 'Growth', val: 'Logarithmic', color: 'text-green-400' },
                  { icon: Shield, label: 'Decay Floor', val: 'Configurable', color: 'text-purple-400' },
                ].map(({ icon: Icon, label, val, color }) => (
                  <div key={label} className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                    <Icon className={`w-5 h-5 ${color} mb-2`} />
                    <div className="text-sm text-gray-400">{label}</div>
                    <div className="font-semibold text-white">{val}</div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm text-gray-500 leading-relaxed">
                When two circles from the same club overlap, they merge using metaball blending — creating a unified, organic territory shape. Circles slowly decay without activity, keeping competition dynamic.
              </p>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-4 relative">
        <GlowOrb color="radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)" size="w-[500px] h-[500px]" position="center" animation="" />

        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">Getting Started</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-5 text-white">Up and Running in Minutes</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">No setup required. Sign in with Google and you're ready.</p>
          </AnimatedSection>

          <div className="space-y-6">
            {[
              {
                num: '01',
                title: 'Sign In & Join a Club',
                desc: 'Create your account with Google in one click. Browse public clubs or enter a password to join a private one. Or start your own club and invite members.',
                color: 'from-blue-500 to-blue-600',
              },
              {
                num: '02',
                title: 'Attend Events or Submit Hours',
                desc: 'Find service requests in your area, attend events posted by your club or affiliated partners, or manually submit hours for any volunteer activity — with optional photo proof.',
                color: 'from-purple-500 to-purple-600',
              },
              {
                num: '03',
                title: 'Get Approved',
                desc: 'Admins review submissions through a clean interface. Multi-admin approval thresholds available. Admins can also grant hours directly for events they organized.',
                color: 'from-green-500 to-green-600',
              },
              {
                num: '04',
                title: 'Watch Your Territory Grow',
                desc: "Approved hours expand your club's circles on the live world map. Compete globally, affiliate with partner organizations, and climb the leaderboards.",
                color: 'from-yellow-500 to-orange-500',
              },
            ].map((step, i) => (
              <AnimatedSection key={step.num} delay={i * 100}>
                <div className="flex items-start gap-6 p-6 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-white/15 transition-all duration-300">
                  <div className={`flex-shrink-0 w-14 h-14 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center`}>
                    <span className="text-lg font-bold text-white/80">{step.num}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">{step.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-28 px-4 relative">
        <GlowOrb color="radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(168,85,247,0.3) 50%, transparent 70%)" size="w-[700px] h-[700px]" position="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" animation="" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <AnimatedSection>
            <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-8">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white/80">Free to Join</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Ready to Make<br />Your Mark?
            </h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join clubs competing to cover the globe in service hours. Every minute you volunteer puts your name on the map — literally.
            </p>
            <button
              onClick={isSignedIn ? () => setLocation('/') : handleGoogleSignIn}
              disabled={loading}
              className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-black text-lg font-semibold rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_70px_rgba(255,255,255,0.25)] disabled:opacity-50"
            >
              {isSignedIn ? "Go to App" : loading ? "Signing in..." : "Start Volunteering Now"}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <img src={logoImg} alt="VolunteerClub" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold text-white">VolunteerClub</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <button onClick={() => scrollTo('features')} className="hover:text-gray-300 transition-colors">Features</button>
            <button onClick={() => scrollTo('events')} className="hover:text-gray-300 transition-colors">Events</button>
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-gray-300 transition-colors">How It Works</button>
          </div>
          <p className="text-sm text-gray-600">Volunteer. Compete. Grow.</p>
        </div>
      </footer>
    </div>
  );
}
