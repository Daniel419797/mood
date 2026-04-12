"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  LayoutDashboard,
  Lightbulb,
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
  { href: "/mood/history", label: "Mood History", icon: Brain },
  { href: "/eating/history", label: "Eating Log", icon: Utensils },
  { href: "/insights", label: "Behavioral Insights", icon: Lightbulb },
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
  const isFocusedComposer = pathname === "/mood/new" || pathname === "/eating/new";

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

  if (isFocusedComposer) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <span className="rounded-md bg-foreground p-1.5 text-background">
                  <Brain className="h-4 w-4" />
                </span>
                MindfulMorsel
              </Link>
            </div>

            <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
              <Link href="/#methodology" className="hover:text-foreground">Methodology</Link>
              <Link href="/#science" className="hover:text-foreground">Science</Link>
              <button type="button" onClick={() => router.push("/dashboard")} className="font-medium text-foreground">Cancel</button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[250px_1fr]">
        <aside className="hidden border-r bg-background lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b px-5">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="rounded-md bg-foreground p-1.5 text-background">
                <Brain className="h-4 w-4" />
              </span>
              MindfulMorsel
            </Link>
          </div>

          <nav className="space-y-1 px-3 py-4">
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

          <div className="mt-auto border-t p-4">
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">Pro Plan</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-b bg-background lg:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <span className="rounded-md bg-foreground p-1.5 text-background">
                  <Brain className="h-4 w-4" />
                </span>
                MindfulMorsel
              </Link>
              <UserMenu initials={initials} onLogout={handleLogout} />
            </div>
            <div className="flex gap-1 overflow-x-auto px-4 pb-3">
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

          <main className="min-w-0 p-4 md:p-6 lg:p-7">{children}</main>

          <div className="fixed bottom-4 right-4 hidden lg:block">
            <UserMenu initials={initials} onLogout={handleLogout} />
          </div>
        </div>
      </div>
    </div>
  );
}
