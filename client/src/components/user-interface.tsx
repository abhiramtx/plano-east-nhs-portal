import { useState, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { User, getCurrentUser, onAuthStateChanged } from "@/lib/firebase";
import { Sidebar } from "@/components/sidebar";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Hours from "@/pages/hours";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

export default function UserInterface() {
  const [user, setUser] = useState<User | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setUser(user);
    });

    return unsubscribe;
  }, []);

  // If user is not logged in, show home page
  if (!user) {
    return <Home />;
  }

  // If user is logged in, show the main app with sidebar
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/user_interface" component={Dashboard} />
          <Route path="/user_interface/dashboard" component={Dashboard} />
          <Route path="/user_interface/hours" component={Hours} />
          <Route path="/user_interface/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}