import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import logoImg from "@assets/image_1772414281666.png";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#faf8f4]">
      <div className="w-full max-w-lg mx-4 text-center">
        <div className="bg-[#faf8f4] border border-[#d9cdbd] rounded-2xl shadow-sm p-12">
          <div className="mb-8">
            <img src={logoImg} alt="VolunteerClub" className="w-16 h-16 mx-auto rounded-xl" />
          </div>

          <h1 className="text-8xl font-black mb-4 text-gray-900">
            404
          </h1>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Page Not Found
          </h2>

          <p className="text-gray-600 mb-10 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/volunteer/dashboard">
              <Button className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium">
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="border-[#c9bfae] hover:border-gray-400 text-gray-700 hover:bg-[#faf8f4] px-6 py-3 rounded-lg font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="mt-10 h-px bg-gray-200 w-full max-w-xs mx-auto"></div>

          <p className="mt-4 text-sm text-gray-500">
            VolunteerClub
          </p>
        </div>
      </div>
    </div>
  );
}
