import { useState, useEffect, useRef } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Globe, Users, Trophy, MapPin, ArrowRight, Zap, Shield, Target, ChevronDown, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface LandingProps {
  onSignIn: () => void;
}

function useScrollAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
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
        transform: isVisible ? 'translateY(0)' : 'translateY(50px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function Landing({ onSignIn }: LandingProps) {
  const [loading, setLoading] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Sign-in error:", error);
      toast({
        title: "Sign-in failed",
        description: error.message || "Authentication failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-black text-white overflow-x-hidden">
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrollY > 50 ? 'bg-black/90 backdrop-blur-lg border-b border-white/10' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-black" />
              </div>
              <span className="text-xl font-bold text-white">VolunteerClub</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('features')} className="text-gray-400 hover:text-white transition-colors">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-gray-400 hover:text-white transition-colors">How It Works</button>
              <button onClick={() => scrollToSection('cta')} className="text-gray-400 hover:text-white transition-colors">Join</button>
            </div>
            <button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="px-6 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Get Started"}
            </button>
          </div>
        </div>
      </nav>

      <section className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute top-[20%] left-[15%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-40"
            style={{ 
              background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)',
              transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.05}px)` 
            }}
          />
          <div 
            className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-40"
            style={{ 
              background: 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)',
              transform: `translate(-${scrollY * 0.1}px, -${scrollY * 0.05}px)` 
            }}
          />
          <div 
            className="absolute top-[50%] left-[50%] w-[300px] h-[300px] rounded-full blur-[80px] opacity-30"
            style={{ 
              background: 'radial-gradient(circle, rgba(34,197,94,0.5) 0%, transparent 70%)',
              transform: `translate(-50%, -50%) scale(${1 + scrollY * 0.001})` 
            }}
          />
        </div>
        
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-8">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white/80">Gamify Your Impact</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight leading-tight text-white">
            Grow Your Territory
            <br />
            Through Volunteering
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12">
            Compete with clubs, claim territories, and make a real difference in your community. 
            Every hour you volunteer expands your reach.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Start Volunteering"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => scrollToSection('features')}
              className="flex items-center gap-3 px-8 py-4 bg-transparent border border-white/20 text-white font-semibold rounded-full hover:bg-white/5 hover:border-white/40 transition-all duration-300"
            >
              <Play className="w-5 h-5" />
              Learn More
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => scrollToSection('features')}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce"
        >
          <ChevronDown className="w-8 h-8 text-gray-500" />
        </button>
      </section>

      <section id="features" className="min-h-screen flex items-center py-20 px-4 relative">
        <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)' }}
        />
        
        <div className="max-w-7xl mx-auto w-full">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">Why VolunteerClub?</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Turn your volunteer efforts into a competitive game that benefits everyone.
            </p>
          </AnimatedSection>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AnimatedSection delay={100}>
              <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-500 hover:scale-105 hover:bg-white/[0.07]">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-white">Claim Territories</h3>
                <p className="text-gray-400 text-lg">
                  Your volunteer hours grow your club's territory on the map. Watch your influence expand across the globe.
                </p>
              </div>
            </AnimatedSection>
            
            <AnimatedSection delay={200}>
              <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-500 hover:scale-105 hover:bg-white/[0.07]">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-white">Join or Create Clubs</h3>
                <p className="text-gray-400 text-lg">
                  Team up with friends or create your own club. Compete together for territory dominance.
                </p>
              </div>
            </AnimatedSection>
            
            <AnimatedSection delay={300}>
              <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-500 hover:scale-105 hover:bg-white/[0.07]">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-white">Climb Leaderboards</h3>
                <p className="text-gray-400 text-lg">
                  Track daily, weekly, monthly rankings. See who's making the biggest impact globally.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="min-h-screen flex items-center py-20 px-4 relative">
        <div className="absolute bottom-[20%] left-[5%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.6) 0%, transparent 70%)' }}
        />
        
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">How It Works</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Get started in minutes and begin making an impact today.
            </p>
          </AnimatedSection>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                { num: "01", title: "Join or Create a Club", desc: "Find a club that matches your interests or start your own. Set it as public or private with a password." },
                { num: "02", title: "Find Service Requests", desc: "Browse volunteer opportunities from organizations and individuals who need help in your area." },
                { num: "03", title: "Log Volunteer Hours", desc: "Submit your volunteer activities for approval. Approved hours grow your territory." },
                { num: "04", title: "Expand & Compete", desc: "Watch your club's territory grow on the map. Compete with other clubs for dominance." },
              ].map((step, i) => (
                <AnimatedSection key={step.num} delay={i * 100}>
                  <div className="flex items-start space-x-6 group">
                    <div className="flex-shrink-0 w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-white/30 group-hover:bg-white/10 transition-all">
                      <span className="text-2xl font-bold text-white/50 group-hover:text-white transition-colors">{step.num}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-blue-400 transition-colors">{step.title}</h3>
                      <p className="text-gray-400">{step.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
            
            <AnimatedSection delay={400}>
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
                  <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                      scale: 120,
                      center: [0, 30]
                    }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill="#1e293b"
                            stroke="#334155"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: 'none' },
                              hover: { fill: '#334155', outline: 'none' },
                              pressed: { outline: 'none' },
                            }}
                          />
                        ))
                      }
                    </Geographies>
                  </ComposableMap>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[30%] left-[25%] w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-50" />
                    <div className="absolute top-[45%] left-[55%] w-6 h-6 bg-green-500 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.5s' }} />
                    <div className="absolute top-[35%] left-[70%] w-5 h-5 bg-purple-500 rounded-full animate-ping opacity-50" style={{ animationDelay: '1s' }} />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl animate-bounce" style={{ animationDuration: '2s' }}>
                  <Target className="w-12 h-12 text-white" />
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section id="cta" className="min-h-screen flex items-center py-20 px-4 relative">
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[150px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(168,85,247,0.3) 50%, transparent 70%)' }}
        />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <AnimatedSection>
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">Ready to Make an Impact?</h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Join thousands of volunteers competing to make their communities better. 
              Your journey starts with a single click.
            </p>
            <button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-black text-lg font-semibold rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Get Started Now"}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </AnimatedSection>
        </div>
      </section>

      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-black" />
            </div>
            <span className="font-semibold text-white">VolunteerClub</span>
          </div>
          <p className="text-sm text-gray-500">
            Make a difference. Grow your territory. Compete with purpose.
          </p>
        </div>
      </footer>
    </div>
  );
}
