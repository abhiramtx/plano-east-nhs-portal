import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Paintbrush, Home, ArrowLeft, Sparkles, Stars, Palette } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating Icons */}
        <div className="absolute top-10 left-1/4 animate-bounce" style={{ animationDuration: '3s', animationDelay: '0.5s' }}>
          <Sparkles className="w-6 h-6 text-purple-400/40" />
        </div>
        <div className="absolute bottom-20 left-1/3 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '1s' }}>
          <Stars className="w-8 h-8 text-blue-400/40" />
        </div>
        <div className="absolute top-1/3 right-1/4 animate-bounce" style={{ animationDuration: '3.5s' }}>
          <Palette className="w-7 h-7 text-pink-400/40" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-3xl mx-4 text-center">
        {/* Glassmorphic Card */}
        <div className="backdrop-blur-xl bg-white/70 border border-white/40 rounded-3xl shadow-2xl p-12 transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl">
          {/* Animated Icon with Glow */}
          <div className="relative mb-8 inline-block">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative flex items-center justify-center w-28 h-28 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-full shadow-lg transform transition-transform duration-500 hover:rotate-12 hover:scale-110">
              <Paintbrush className="w-14 h-14 text-white" />
            </div>
            {/* Floating Sparkles */}
            <div className="absolute -top-3 -right-3 animate-ping">
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="absolute -bottom-2 -left-2 animate-pulse" style={{ animationDelay: '0.5s' }}>
              <Stars className="w-5 h-5 text-purple-400" />
            </div>
          </div>

          {/* 404 Title with Gradient */}
          <h1 className="text-8xl font-black mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
            404
          </h1>
          
          {/* Subtitle */}
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Oops! Lost in the Gallery
          </h2>

          {/* Description */}
          <p className="text-lg text-gray-700 mb-10 max-w-lg mx-auto leading-relaxed">
            Looks like this masterpiece doesn't exist yet. The canvas you're looking for 
            hasn't been painted in our NAHS collection.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/student/dashboard" data-testid="link-dashboard">
              <Button 
                className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-1"
                data-testid="button-back-to-dashboard"
              >
                <Home className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Back to Dashboard
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="group border-2 border-gray-300 hover:border-purple-400 text-gray-700 hover:text-purple-600 bg-white/80 backdrop-blur-sm px-8 py-4 rounded-xl font-semibold text-base shadow-md hover:shadow-lg transform transition-all duration-300 hover:-translate-y-1"
              data-testid="button-go-back"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Go Back
            </Button>
          </div>

          {/* Decorative Line */}
          <div className="mt-10 mb-6 flex items-center justify-center">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent w-full max-w-md"></div>
          </div>

          {/* Footer Info */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-gray-600 mb-2">
              <Paintbrush className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Wylie National Art Honor Society</span>
            </div>
            <p className="text-sm text-gray-500 italic">
              Creating art • Building character • Serving community
            </p>
          </div>
        </div>

        {/* Bottom Accent */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Error Code: 404 • Page Not Found
          </p>
        </div>
      </div>
    </div>
  );
}
