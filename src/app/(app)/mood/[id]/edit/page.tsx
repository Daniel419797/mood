"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { moodApi } from "@/services/mood";
import { MoodForm } from "@/components/MoodForm";
import { Skeleton } from "@/components/ui/skeleton";
import type { MoodLog } from "@/types";

export default function EditMoodPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<MoodLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    moodApi
      .list()
      .then((res) => {
        const found = res.data.data.find((m) => m.id === id);
        if (!found) {
          toast.error("Entry not found.");
          router.replace("/mood/history");
        } else {
          setEntry(found);
        }
      })
      .catch(() => {
        toast.error("Failed to load entry.");
        router.replace("/mood/history");
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return entry ? <MoodForm existing={entry} /> : null;
}
