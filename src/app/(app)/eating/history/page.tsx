"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
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
import { eatingApi } from "@/services/eating";
import type { EatingLog } from "@/types";
import { Pencil, Plus, Trash2, Utensils } from "lucide-react";

const categoryColor: Record<string, string> = {
  Healthy: "bg-white text-black border border-black",
  Neutral: "bg-black text-white",
  Sugary: "bg-white text-black border border-black",
  Junk: "bg-black text-white",
  Skipped: "bg-white text-black border border-black",
};

function EatingRow({ entry, onDeleted }: { entry: EatingLog; onDeleted: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await eatingApi.delete(entry.id);
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
        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[130px_1fr_90px_80px_90px_56px]">
          <div>
            <p className="text-[11px] text-muted-foreground">{isToday(new Date(entry.loggedAt)) ? "Today" : "Earlier"}</p>
            <p className="font-semibold">{format(parseISO(entry.loggedAt), "p")}</p>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">{entry.mealType}</p>
            <p className="truncate font-medium">{entry.description || "No description"}</p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Category</p>
            <Badge className={categoryColor[entry.foodCategory] ?? ""}>{entry.foodCategory}</Badge>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Portion</p>
            <p className="font-medium">{entry.portionRating}</p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Hunger</p>
            <p className="font-medium">{entry.hungerBefore}/5</p>
          </div>

          <div className="flex justify-end gap-1">
            <LinkButton href={`/eating/${entry.id}/edit`} variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </LinkButton>
            <AlertDialog>
              <AlertDialogTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-muted">
                <Trash2 className="h-4 w-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete eating entry?</AlertDialogTitle>
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

export default function EatingHistoryPage() {
  const [entries, setEntries] = useState<EatingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filtered, setFiltered] = useState<EatingLog[]>([]);

  useEffect(() => {
    eatingApi
      .list({ limit: 200 })
      .then((res) => {
        setEntries(res.data.data);
        setFiltered(res.data.data);
      })
      .catch(() => toast.error("Failed to load eating history."))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    let result = [...entries];
    if (from) result = result.filter((e) => e.loggedAt >= from);
    if (to) result = result.filter((e) => e.loggedAt <= `${to}T23:59:59Z`);
    setFiltered(result);
  }, [from, to, entries]);

  const grouped = useMemo(() => {
    const map = new Map<string, EatingLog[]>();
    for (const entry of filtered) {
      const key = format(parseISO(entry.loggedAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const handleDeleted = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const loggedToday = entries.filter((e) => isToday(new Date(e.loggedAt))).length;
  const skippedThisWeek = entries.filter((e) => e.foodCategory === "Skipped").length;
  const avgHunger = entries.length
    ? (entries.reduce((acc, e) => acc + e.hungerBefore, 0) / entries.length).toFixed(1)
    : "0.0";

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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-4xl">Eating History</h1>
          <p className="text-muted-foreground">Review and manage your logged meals and snacks</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" className="h-9 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" className="h-9 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
          <LinkButton href="/eating/new" className="gap-1.5 bg-foreground text-background hover:bg-foreground/85">
            <Plus className="h-4 w-4" /> Log Meal
          </LinkButton>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Logged Today</p>
            <p className="font-semibold">{loggedToday} Meals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Skipped Meals</p>
            <p className="font-semibold">{skippedThisWeek} this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Avg. Hunger</p>
            <p className="font-semibold">{avgHunger} / 5</p>
          </CardContent>
        </Card>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Utensils className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No eating entries yet. Start logging today.</p>
            <LinkButton href="/eating/new">Log First Meal</LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([dateKey, items]) => (
            <div key={dateKey} className="space-y-3">
              <p className="font-semibold">{format(parseISO(`${dateKey}T00:00:00Z`), "EEEE, MMM d")}</p>
              <div className="space-y-3">
                {items.map((entry) => (
                  <EatingRow key={entry.id} entry={entry} onDeleted={handleDeleted} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(from || to) && (
        <div className="text-center">
          <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>
            Clear Filter
          </Button>
        </div>
      )}
    </div>
  );
}
