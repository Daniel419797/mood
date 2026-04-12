"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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
import { Brain, Pencil, Trash2, PlusCircle } from "lucide-react";

const moodColour: Record<string, string> = {
  Happy: "bg-green-100 text-green-800",
  Calm: "bg-blue-100 text-blue-800",
  Bored: "bg-gray-100 text-gray-700",
  Anxious: "bg-yellow-100 text-yellow-800",
  Stressed: "bg-orange-100 text-orange-800",
  Sad: "bg-indigo-100 text-indigo-800",
};

function MoodCard({
  entry,
  onDeleted,
}: {
  entry: MoodLog;
  onDeleted: (id: string) => void;
}) {
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
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Badge className={moodColour[entry.moodLabel] ?? ""}>{entry.moodLabel}</Badge>
              <Badge variant="outline">Score {entry.moodScore}/5</Badge>
              <Badge variant="outline">Stress {entry.stressLevel}/5</Badge>
              <Badge variant="outline">Energy {entry.energyLevel}/5</Badge>
              <Badge variant="outline">Sleep {entry.sleepHours}h</Badge>
              <Badge variant="outline">{entry.workload} workload</Badge>
            </div>
            {entry.notes && (
              <p className="text-sm text-muted-foreground line-clamp-2">{entry.notes}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {format(parseISO(entry.loggedAt), "PPpp")}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
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
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting…" : "Delete"}
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
    if (to) result = result.filter((e) => e.loggedAt <= to + "T23:59:59Z");
    setFiltered(result);
  }, [from, to, entries]);

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6" /> Mood History
        </h1>
        <LinkButton href="/mood/new" size="sm">
          <PlusCircle className="h-4 w-4 mr-1" /> Log Mood
        </LinkButton>
      </div>

      {/* Date filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium">From</label>
          <Input
            type="date"
            className="w-36 h-8"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium">To</label>
          <Input
            type="date"
            className="w-36 h-8"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        {(from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFrom(""); setTo(""); }}
          >
            Clear
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <Brain className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No mood entries yet. Start logging today!</p>
          <LinkButton href="/mood/new">
            Log First Mood
          </LinkButton>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <MoodCard key={entry.id} entry={entry} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
