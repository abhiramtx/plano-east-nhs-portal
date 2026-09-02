import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  Menu,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import logoImg from "@assets/image_1772414281666.png";

interface LandingProps {
  onSignIn: () => void;
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), { threshold: 0.12 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`landing-reveal ${visible ? "is-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
  .landing-page { --paper:#121212; --paper-deep:#1b1d1a; --ink:#f3efe6; --ink-soft:#a8aa9f; --coral:#d4785f; --marigold:#d7a85a; --teal:#63a89a; --line:#343731; background:var(--paper); color:var(--ink); font-family:'Manrope', sans-serif; }
  .landing-page * { box-sizing:border-box; }
  .landing-page h1,.landing-page h2,.landing-page h3 { font-family:inherit; letter-spacing:-.03em; }
  .landing-page .serif { font-family:inherit; }
  .landing-page .landing-reveal { opacity:0; transform:translateY(24px); transition:opacity .7s ease, transform .7s ease; }
  .landing-page .landing-reveal.is-visible { opacity:1; transform:translateY(0); }
  .landing-page .paper-grid { background-image:linear-gradient(rgba(173,177,151,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(173,177,151,.025) 1px,transparent 1px); background-size:32px 32px; }
  .landing-page .scribble { position:relative; }
  .landing-page .scribble:after { content:""; position:absolute; left:-3%; right:-3%; bottom:-5px; height:8px; border-top:2px solid var(--coral); border-radius:50%; transform:rotate(-2deg); }
  .landing-page .map-dot { position:absolute; border-radius:999px; border:2px solid var(--paper); box-shadow:none; }
  .landing-page .map-line { position:absolute; height:1px; background:rgba(99,168,154,.45); transform-origin:left center; }
  .landing-page .nav-shadow { box-shadow:none; }
  @media (prefers-reduced-motion:reduce) { .landing-page .landing-reveal { opacity:1; transform:none; transition:none; } .landing-page * { scroll-behavior:auto !important; } }
`;

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-[var(--teal)]">{children}</p>;
}

function Landing({ onSignIn }: LandingProps) {
  const [isSignedIn, setIsSignedIn] = useState(!!auth.currentUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setIsSignedIn(!!user));
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { unsubscribe(); window.removeEventListener("scroll", onScroll); };
  }, []);

  const go = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  const enter = () => {
    if (isSignedIn) setLocation("/");
    else {
      onSignIn();
      setLocation("/login");
    }
  };

  return (
    <div className="landing-page min-h-[100dvh] overflow-x-hidden">
      <style>{style}</style>
      <nav className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${scrolled ? "nav-shadow bg-[var(--paper)]/95 backdrop-blur-sm" : "bg-[var(--paper)]"}`}>
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 lg:px-8">
          <button onClick={() => go("hero")} className="flex items-center gap-3 text-left">
            <img src={logoImg} alt="VolunteerClub mark" className="h-10 w-10 rounded-xl object-cover" />
            <span className="serif text-[19px] font-bold tracking-[-.02em]">VolunteerClub</span>
          </button>
          <div className="hidden items-center gap-8 md:flex">
            <button onClick={() => go("features")} className="text-sm font-semibold text-[var(--ink-soft)] transition-colors hover:text-[var(--coral)]">What it keeps</button>
            <button onClick={() => go("events")} className="text-sm font-semibold text-[var(--ink-soft)] transition-colors hover:text-[var(--coral)]">Events</button>
            <button onClick={() => go("how-it-works")} className="text-sm font-semibold text-[var(--ink-soft)] transition-colors hover:text-[var(--coral)]">How it works</button>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <button onClick={enter} className="rounded-full px-4 py-2 text-sm font-bold text-[var(--ink)] hover:bg-[var(--paper-deep)]">{isSignedIn ? "Open app" : "Sign in"}</button>
            <button onClick={enter} className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-bold text-[var(--paper)] transition-transform hover:-translate-y-0.5">Start a club</button>
          </div>
          <button className="md:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
        {menuOpen && <div className="border-t border-[var(--line)] bg-[var(--paper)] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <button onClick={() => go("features")} className="py-2 text-left font-semibold">What it keeps</button>
            <button onClick={() => go("events")} className="py-2 text-left font-semibold">Events</button>
            <button onClick={() => go("how-it-works")} className="py-2 text-left font-semibold">How it works</button>
            <button onClick={enter} className="mt-1 rounded-full bg-[var(--coral)] px-5 py-3 font-bold text-white">{isSignedIn ? "Open app" : "Start a club"}</button>
          </div>
        </div>}
      </nav>

      <main>
        <section id="hero" className="paper-grid relative overflow-hidden px-5 pb-20 pt-36 lg:pb-28 lg:pt-48">
          <div className="pointer-events-none absolute -right-20 top-28 h-64 w-64 rounded-full bg-[var(--marigold)]/20 blur-3xl" />
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-20">
            <Reveal>
              <SectionLabel>A shared record of showing up</SectionLabel>
              <h1 className="max-w-3xl text-[clamp(3.5rem,8vw,7rem)] font-semibold leading-[.93] tracking-[-.055em]">Good work<br /><span className="scribble text-[var(--coral)]">deserves</span> a place<br />to live.</h1>
              <p className="mt-8 max-w-xl text-lg leading-8 text-[var(--ink-soft)] lg:text-xl">VolunteerClub gives student service clubs one calm place to plan events, approve hours, and see the shape of their work in the community.</p>
              <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <button onClick={enter} className="group flex items-center gap-3 rounded-full bg-[var(--coral)] px-6 py-3.5 font-bold text-white shadow-[4px_4px_0_var(--ink)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_var(--ink)]">{isSignedIn ? "Open your club" : "Start a club"}<ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></button>
                <button onClick={() => go("how-it-works")} className="flex items-center gap-2 rounded-full px-3 py-3 font-bold text-[var(--ink)] hover:text-[var(--coral)]">See how it works <ChevronDown size={17} /></button>
              </div>
              <div className="mt-12 flex items-center gap-7 border-t border-[var(--line)] pt-5 text-sm text-[var(--ink-soft)]">
                <span><strong className="block text-xl text-[var(--ink)]">One place</strong>for the whole club</span>
                <span><strong className="block text-xl text-[var(--ink)]">Less chasing</strong>more doing</span>
              </div>
            </Reveal>
            <Reveal delay={130}>
              <div className="relative mx-auto w-full max-w-[510px]">
                <div className="rounded-[28px] border border-[var(--ink)]/15 bg-[#e4eee8] p-3 shadow-[12px_14px_0_rgba(23,50,77,.12)]">
                  <div className="relative h-[390px] overflow-hidden rounded-[20px] bg-[#d9e8df]">
                    <div className="absolute inset-0 opacity-45" style={{ backgroundImage: "linear-gradient(30deg, transparent 48%, #98bcb0 49%, transparent 51%), linear-gradient(150deg, transparent 48%, #98bcb0 49%, transparent 51%)", backgroundSize: "82px 82px" }} />
                    <div className="absolute left-[13%] top-[18%] h-32 w-48 rotate-12 rounded-[45%] bg-[#c4dcd0]" />
                    <div className="absolute right-[8%] top-[39%] h-44 w-40 -rotate-12 rounded-[48%] bg-[#c4dcd0]" />
                    <div className="map-line left-[25%] top-[47%] w-[44%] rotate-[15deg]" /><div className="map-line left-[47%] top-[55%] w-[28%] rotate-[-32deg]" />
                    <div className="map-dot left-[25%] top-[44%] h-5 w-5 bg-[var(--coral)] text-[var(--coral)]" /><div className="map-dot left-[45%] top-[53%] h-7 w-7 bg-[var(--marigold)] text-[var(--marigold)]" /><div className="map-dot left-[70%] top-[28%] h-4 w-4 bg-[var(--teal)] text-[var(--teal)]" /><div className="map-dot left-[72%] top-[67%] h-5 w-5 bg-[var(--coral)] text-[var(--coral)]" />
                    <div className="absolute bottom-4 left-4 rounded-xl border border-[var(--ink)]/10 bg-[var(--paper)]/90 p-3 shadow-md"><p className="text-[10px] font-bold uppercase tracking-widest text-[var(--teal)]">This month</p><p className="serif mt-1 text-2xl">126 hours</p><p className="text-xs text-[var(--ink-soft)]">across 8 local places</p></div>
                    <div className="absolute right-4 top-4 rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs font-bold text-[var(--paper)]">The work, mapped</div>
                  </div>
                </div>
                <div className="absolute -bottom-7 -left-5 -rotate-6 rounded-xl bg-[var(--marigold)] px-4 py-3 font-bold text-[var(--ink)] shadow-md"><Sparkles size={15} className="mr-2 inline" />A living record</div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-y border-[var(--line)] bg-[var(--ink)] px-5 py-8 text-[var(--paper)]">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p className="serif text-xl">Made for the people who keep a club moving.</p>
            <p className="text-sm text-[var(--paper)]/65">Organizers · members · faculty advisors · neighbors</p>
          </div>
        </section>

        <section id="features" className="px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal><SectionLabel>The useful middle</SectionLabel><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><h2 className="max-w-md text-4xl leading-tight tracking-[-.04em] md:text-6xl">The work is human.<br /><span className="text-[var(--teal)]">The record can be simple.</span></h2><p className="max-w-xl self-end text-lg leading-8 text-[var(--ink-soft)]">No performance theater. Just the details a real club needs after the meeting ends: who came, what happened, which hours are ready, and where your people made a difference.</p></div></Reveal>
            <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: CalendarDays, title: "Plan the next thing", text: "Keep events, details, and attendance in one shared place.", color: "bg-[#f4d9c8]" },
                { icon: Clock3, title: "Make hours count", text: "Members submit time. Admins review it without a spreadsheet chase.", color: "bg-[#d4e6dc]" },
                { icon: MapPin, title: "See your footprint", text: "Connect service hours to the places and people they reached.", color: "bg-[#f0dfaf]" },
                { icon: Users, title: "Keep people in step", text: "A clear home for club members, roles, and the work ahead.", color: "bg-[#d8d9e9]" },
              ].map((item, i) => <Reveal key={item.title} delay={i * 70}><article className="h-full border-t-2 border-[var(--ink)] pt-5"><div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${item.color}`}><item.icon size={22} /></div><h3 className="text-2xl">{item.title}</h3><p className="mt-3 leading-7 text-[var(--ink-soft)]">{item.text}</p></article></Reveal>)}
            </div>
          </div>
        </section>

        <section id="events" className="bg-[var(--paper-deep)] px-5 py-24 lg:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_.9fr]">
            <Reveal><SectionLabel>For the day-of details</SectionLabel><h2 className="max-w-xl text-4xl leading-tight tracking-[-.04em] md:text-6xl">From “who’s coming?” to “thank you for being here.”</h2><p className="mt-6 max-w-lg text-lg leading-8 text-[var(--ink-soft)]">Set up an event that matches the moment. Keep it open for ongoing service, protect it with a code, or use a quick QR check-in when everyone arrives at once.</p><div className="mt-8 space-y-4">{["Open events for flexible service", "Password events for your club", "QR check-in and check-out for accurate time"].map((x) => <p key={x} className="flex items-center gap-3 font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--teal)] text-white"><Check size={14} /></span>{x}</p>)}</div></Reveal>
            <Reveal delay={120}><div className="relative rounded-[26px] bg-[var(--ink)] p-6 text-[var(--paper)] shadow-[10px_10px_0_var(--coral)]"><div className="flex items-center justify-between border-b border-[var(--paper)]/15 pb-5"><div><p className="text-xs uppercase tracking-[.18em] text-[var(--paper)]/55">Saturday, April 19</p><h3 className="mt-2 text-3xl">River clean-up</h3></div><div className="rounded-xl bg-[var(--marigold)] p-3 text-[var(--ink)]"><QrCode size={24} /></div></div><div className="py-6"><div className="flex items-center justify-between text-sm text-[var(--paper)]/65"><span>Attendance</span><span className="text-[var(--paper)]">18 of 24 spots</span></div><div className="mt-3 h-3 rounded-full bg-[var(--paper)]/15"><div className="h-3 w-3/4 rounded-full bg-[var(--marigold)]" /></div></div><div className="grid grid-cols-2 gap-3 border-t border-[var(--paper)]/15 pt-5 text-sm"><p><span className="block text-[var(--paper)]/50">Meet at</span>South footbridge</p><p><span className="block text-[var(--paper)]/50">Hours logged</span>41.5 so far</p></div></div></Reveal>
          </div>
        </section>

        <section id="how-it-works" className="px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-6xl"><Reveal><SectionLabel>A small rhythm that works</SectionLabel><h2 className="max-w-2xl text-4xl leading-tight tracking-[-.04em] md:text-6xl">Start with the next good thing.</h2></Reveal><div className="mt-14 grid gap-0 md:grid-cols-3">{[{ n:"01", title:"Bring your people together", text:"Create a club, invite members, and give the right people a say in approvals.", icon:Users },{ n:"02", title:"Show up and log it", text:"Run an event or add hours after the fact. Location and notes keep the story intact.", icon:ShieldCheck },{ n:"03", title:"Make the impact visible", text:"Watch hours gather by person, event, and place — a record you can be proud to share.", icon:Award }].map((step, i) => <Reveal key={step.n} delay={i * 100}><div className={`relative border-t-2 border-[var(--ink)] px-1 py-7 md:min-h-[270px] md:pr-10 ${i > 0 ? "md:border-l md:border-t-0 md:pl-8" : "md:border-t-0"}`}><span className="text-sm font-bold text-[var(--coral)]">{step.n}</span><step.icon className="absolute right-3 top-7 text-[var(--teal)]" size={25} /><h3 className="mt-7 max-w-[220px] text-2xl leading-tight">{step.title}</h3><p className="mt-4 max-w-xs leading-7 text-[var(--ink-soft)]">{step.text}</p></div></Reveal>)}</div></div>
        </section>

        <section className="px-5 pb-28 pt-8 lg:pb-36"><Reveal><div className="mx-auto max-w-6xl rounded-[30px] bg-[var(--coral)] px-7 py-14 text-center text-white shadow-[10px_10px_0_var(--ink)] md:px-16 md:py-20"><p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-white/75">Your club has work to do</p><h2 className="mx-auto max-w-3xl text-4xl leading-tight tracking-[-.04em] md:text-6xl">Give it a home that keeps up.</h2><p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/80">A little less admin. A lot more room for the people and places you’re here to serve.</p><button onClick={enter} className="group mt-9 inline-flex items-center gap-3 rounded-full bg-[var(--paper)] px-6 py-3.5 font-bold text-[var(--ink)] transition-transform hover:-translate-y-1">{isSignedIn ? "Open your club" : "Start a club"}<ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></button></div></Reveal></section>
      </main>
      <footer className="border-t border-[var(--line)] px-5 py-8"><div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-[var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 font-bold text-[var(--ink)]"><img src={logoImg} alt="" className="h-7 w-7 rounded-lg" />VolunteerClub</div><p>For clubs that believe showing up matters.</p><p>© {new Date().getFullYear()} VolunteerClub</p></div></footer>
    </div>
  );
}

export default Landing;