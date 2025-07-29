import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, Home, ArrowLeft, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="w-full max-w-2xl mx-4 text-center">
        {/* Main 404 Card */}
        <Card className="border-0 shadow-none bg-white">
          <CardContent className="pt-12 pb-8">
            {/* Animated Icon */}
            <div className="relative mb-8">
              <div className="flex items-center justify-center w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                <Palette className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-6 h-6 text-purple-500 animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-6">
              Page Not Found
            </h2>

            {/* Description */}
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
              Looks like you've wandered off the artistic path! The page you're looking for 
              doesn't exist in our NAHS gallery.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/student/dashboard">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Message */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <Palette className="w-4 h-4" />
            <span className="text-sm">Wylie National Art Honor Society</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Creating art, building character, serving community
          </p>
        </div>
      </div>
    </div>
  );
}
