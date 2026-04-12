"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Brain,
  LayoutDashboard,
  Lightbulb,
  PlusCircle,
  Settings,
  Utensils,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mood/history", label: "Mood", icon: Brain },
  { href: "/eating/history", label: "Eating", icon: Utensils },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/profile", label: "Profile", icon: Settings },
];

function UserMenu({ initials, onLogout }: { initials: string; onLogout: () => Promise<void> }) {
  const { user } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-medium">{user?.displayName}</div>
        <div className="px-2 pb-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link href="/profile" className="w-full">Profile & Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const initials = (user?.displayName || "U")
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_hsl(30_90%_55%/0.12),_transparent_35%)]">
      <div className="mx-auto flex w-full max-w-[1440px] gap-6 p-4 md:p-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-2xl border bg-background/90 p-4 shadow-sm backdrop-blur lg:flex">
          <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2 py-1">
            <span className="rounded-xl bg-primary p-2 text-primary-foreground">
              <Brain className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading text-sm uppercase tracking-[0.2em] text-muted-foreground">MoodTracker</p>
              <p className="text-sm font-semibold">Personal Dashboard</p>
            </div>
          </Link>

          <nav className="space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <LinkButton
                  key={href}
                  href={href}
                  variant={active ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-2", active && "font-semibold")}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </LinkButton>
              );
            })}
          </nav>

          <div className="mt-6 rounded-xl border bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quick Log</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <LinkButton href="/mood/new" size="sm" className="justify-center">
                Mood
              </LinkButton>
              <LinkButton href="/eating/new" size="sm" variant="outline" className="justify-center">
                Meal
              </LinkButton>
            </div>
          </div>

          <div className="mt-auto rounded-xl border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-semibold">{user?.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="sticky top-3 z-40 rounded-2xl border bg-background/90 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
                <p className="font-heading text-lg leading-tight">Welcome back, {user?.displayName?.split(" ")[0]}</p>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80">
                    <PlusCircle className="h-4 w-4" />
                    <span>Log</span>
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
                <UserMenu initials={initials} onLogout={handleLogout} />
              </div>
            </div>

            <div className="mt-2 flex gap-1 overflow-x-auto pb-1 lg:hidden">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <LinkButton
                    key={href}
                    href={href}
                    size="sm"
                    variant={active ? "secondary" : "ghost"}
                    className={cn("shrink-0 gap-1.5", active && "font-semibold")}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </LinkButton>
                );
              })}
            </div>
          </header>

          <main className="min-w-0 rounded-2xl border bg-background/95 p-4 shadow-sm md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
