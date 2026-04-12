"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { eatingApi } from "@/services/eating";
import { EatingForm } from "@/components/EatingForm";
import { Skeleton } from "@/components/ui/skeleton";
import type { EatingLog } from "@/types";

export default function EditEatingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<EatingLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    eatingApi
      .list()
      .then((res) => {
        const found = res.data.data.find((e) => e.id === id);
        if (!found) {
          toast.error("Entry not found.");
          router.replace("/eating/history");
        } else {
          setEntry(found);
        }
      })
      .catch(() => {
        toast.error("Failed to load entry.");
        router.replace("/eating/history");
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

  return entry ? <EatingForm existing={entry} /> : null;
}
