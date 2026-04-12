"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/link-button";
import { useAuth } from "@/context/AuthContext";
import { Brain, Utensils, LayoutDashboard, Lightbulb, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mood/history", label: "Mood", icon: Brain },
  { href: "/eating/history", label: "Eating", icon: Utensils },
  { href: "/insights", label: "Insights", icon: Lightbulb },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const initials = user?.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <nav className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
          <Brain className="h-5 w-5" />
          <span>MoodTracker</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <LinkButton
              key={href}
              href={href}
              variant={pathname.startsWith(href) ? "secondary" : "ghost"}
              size="sm"
              className={cn("gap-1.5", pathname.startsWith(href) && "font-medium")}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </LinkButton>
          ))}
        </div>

        {/* Quick-log + user menu */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Log</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link href="/mood/new" className="w-full">Log Mood</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/eating/new" className="w-full">Log Meal</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm font-medium">{user?.displayName}</div>
              <div className="px-2 pb-1.5 text-xs text-muted-foreground truncate">
                {user?.email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/profile" className="w-full">Profile & Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
}
