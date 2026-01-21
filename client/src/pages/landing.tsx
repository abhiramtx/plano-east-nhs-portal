import { useState, useEffect } from "react";
import { User, signInWithGoogle, onAuthStateChanged, initializeAuth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Globe, Users, Trophy, MapPin, ArrowRight, Zap, Shield, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingProps {
  onSignIn: () => void;
}

export default function Landing({ onSignIn }: LandingProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">VolunteerClub</span>
            </div>
            <Button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="bg-black text-white hover:bg-gray-800"
            >
              {loading ? "Signing in..." : "Get Started"}
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full mb-8">
            <Zap className="w-4 h-4 text-gray-700" />
            <span className="text-sm font-medium text-gray-700">Gamify Your Impact</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
            Grow Your Territory<br />
            <span className="text-gray-500">Through Volunteering</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Compete with clubs, claim territories, and make a real difference in your community. 
            Every hour you volunteer expands your reach.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="bg-black text-white hover:bg-gray-800 text-lg px-8 py-6"
            >
              {loading ? "Signing in..." : "Start Volunteering"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-gray-300"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Claim Territories</h3>
              <p className="text-gray-600">
                Your volunteer hours grow your club's territory on the map. Watch your influence expand.
              </p>
            </div>
            
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Join or Create Clubs</h3>
              <p className="text-gray-600">
                Team up with friends or create your own club. Compete together for territory dominance.
              </p>
            </div>
            
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Climb Leaderboards</h3>
              <p className="text-gray-600">
                Track daily, weekly, monthly rankings. See who's making the biggest impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Turn your volunteer efforts into a competitive game that benefits everyone.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-gray-900">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Join or Create a Club</h3>
                  <p className="text-gray-600">
                    Find a club that matches your interests or start your own. 
                    Set it as public or private with a password.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-gray-900">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Log Volunteer Hours</h3>
                  <p className="text-gray-600">
                    Submit your volunteer activities for approval. 
                    Approved hours grow your territory.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-gray-900">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Expand & Compete</h3>
                  <p className="text-gray-600">
                    Watch your club's territory grow on the map. 
                    Compete with other clubs for dominance.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Bonus: High-Need Areas</h3>
                  <p className="text-gray-600">
                    Volunteer in high-need areas for bonus hours. 
                    Help where it matters most.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gray-100 rounded-3xl p-8 aspect-square flex items-center justify-center">
                <div className="relative w-full h-full">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/30 rounded-full blur-xl"></div>
                  <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-green-500/30 rounded-full blur-xl"></div>
                  <div className="absolute bottom-1/4 left-1/3 w-28 h-28 bg-purple-500/30 rounded-full blur-xl"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Globe className="w-24 h-24 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-12 h-12 mx-auto mb-6 text-gray-400" />
          <h2 className="text-4xl font-bold mb-6">Ready to Make an Impact?</h2>
          <p className="text-xl text-gray-400 mb-10">
            Join thousands of volunteers competing to make their communities better.
          </p>
          <Button 
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="bg-white text-black hover:bg-gray-200 text-lg px-8 py-6"
          >
            {loading ? "Signing in..." : "Get Started Now"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Globe className="w-5 h-5 text-gray-600" />
            <span className="text-gray-600 font-medium">VolunteerClub</span>
          </div>
          <p className="text-sm text-gray-500">
            Make a difference. Grow your territory. Compete with purpose.
          </p>
        </div>
      </footer>
    </div>
  );
}
