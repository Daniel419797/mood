"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { moodApi } from "@/services/mood";
import type { MoodLog } from "@/types";
import { Flame, Moon, Pencil, Plus, Trash2 } from "lucide-react";

const workloadColor: Record<string, string> = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-zinc-100 text-zinc-800",
  High: "bg-amber-100 text-amber-700",
};

function MoodEntryCard({ entry, onDeleted }: { entry: MoodLog; onDeleted: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await moodApi.delete(entry.id);
      toast.success("Entry deleted.");
      onDeleted(entry.id);
    } catch {
      toast.error("Failed to delete entry.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border text-xl font-semibold">
                {entry.moodScore}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{entry.moodLabel}</p>
                  <Badge className={workloadColor[entry.workload] ?? ""}>{entry.workload}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{format(parseISO(entry.loggedAt), "p")}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Stress</p>
                <p className="font-semibold">{entry.stressLevel}/5</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Energy</p>
                <p className="font-semibold">{entry.energyLevel}/5</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Sleep</p>
                <p className="font-semibold">{entry.sleepHours} hrs</p>
              </div>
            </div>

            {entry.notes ? (
              <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">{entry.notes}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 gap-1">
            <LinkButton href={`/mood/${entry.id}/edit`} variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </LinkButton>

            <AlertDialog>
              <AlertDialogTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-muted">
                <Trash2 className="h-4 w-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete mood entry?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MoodHistoryPage() {
  const [entries, setEntries] = useState<MoodLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filtered, setFiltered] = useState<MoodLog[]>([]);

  useEffect(() => {
    moodApi
      .list({ limit: 200 })
      .then((res) => {
        setEntries(res.data.data);
        setFiltered(res.data.data);
      })
      .catch(() => toast.error("Failed to load mood history."))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    let result = [...entries];
    if (from) result = result.filter((e) => e.loggedAt >= from);
    if (to) result = result.filter((e) => e.loggedAt <= `${to}T23:59:59Z`);
    setFiltered(result);
  }, [from, to, entries]);

  const grouped = useMemo(() => {
    const map = new Map<string, MoodLog[]>();
    for (const entry of filtered) {
      const key = format(parseISO(entry.loggedAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const avgMood = entries.length
    ? (entries.reduce((acc, e) => acc + e.moodScore, 0) / entries.length).toFixed(1)
    : "0.0";
  const avgSleep = entries.length
    ? (entries.reduce((acc, e) => acc + e.sleepHours, 0) / entries.length).toFixed(1)
    : "0.0";

  const handleDeleted = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-4xl">Mood History</h1>
        <p className="text-muted-foreground">Review and manage your emotional logs</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Mood Distribution</CardTitle>
            <Badge variant="outline">Last 30 Days</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-3">
              {["Happy", "Anxious", "Stressed", "Sad", "Calm", "Bored"].map((label) => {
                const count = entries.filter((e) => e.moodLabel === label).length;
                const barHeight = Math.max(20, count * 8);
                return (
                  <div key={label} className="text-center">
                    <div className="mx-auto mb-2 w-7 rounded-md bg-foreground" style={{ height: `${barHeight}px` }} />
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Avg Mood</span><span className="font-semibold">{avgMood}/5</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Avg Sleep</span><span className="font-semibold">{avgSleep} hrs</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Logs this week</span><span className="font-semibold">{entries.length} entries</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" className="h-9 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="h-9 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        {(from || to) && (
          <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>
            Clear
          </Button>
        )}
        <div className="ml-auto">
          <LinkButton href="/mood/new" className="gap-1.5 bg-foreground text-background hover:bg-foreground/85">
            <Plus className="h-4 w-4" /> Log Mood
          </LinkButton>
        </div>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Moon className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No mood entries yet. Start logging today.</p>
            <LinkButton href="/mood/new">Log First Mood</LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([dateKey, items]) => (
            <div key={dateKey} className="space-y-3">
              <p className="font-semibold">{format(parseISO(`${dateKey}T00:00:00Z`), "EEEE, MMM d")}</p>
              <div className="space-y-3">
                {items.map((entry) => (
                  <MoodEntryCard key={entry.id} entry={entry} onDeleted={handleDeleted} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 text-center">
        <Button variant="ghost" className="gap-2 text-muted-foreground">
          <Flame className="h-4 w-4" /> Load Older Entries
        </Button>
      </div>
    </div>
  );
}
