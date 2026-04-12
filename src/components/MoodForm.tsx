"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { moodApi } from "@/services/mood";
import type { MoodLog } from "@/types";

const schema = z.object({
  moodScore: z.coerce.number().int().min(1).max(5),
  moodLabel: z.enum(["Happy", "Anxious", "Stressed", "Sad", "Calm", "Bored"]),
  stressLevel: z.coerce.number().int().min(1).max(5),
  energyLevel: z.coerce.number().int().min(1).max(5),
  sleepHours: z.coerce.number().min(0).max(24),
  workload: z.enum(["Low", "Medium", "High"]),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface MoodFormProps {
  existing?: MoodLog;
}

function ScoreButtons({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-full border text-sm font-medium transition-colors ${
            value === n
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-secondary"
          }`}
          aria-label={`${label} ${n}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function MoodForm({ existing }: MoodFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!existing;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      moodScore: 3,
      moodLabel: "Calm",
      stressLevel: 3,
      energyLevel: 3,
      sleepHours: 7,
      workload: "Medium",
      notes: "",
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        moodScore: existing.moodScore,
        moodLabel: existing.moodLabel,
        stressLevel: existing.stressLevel,
        energyLevel: existing.energyLevel,
        sleepHours: existing.sleepHours,
        workload: existing.workload,
        notes: existing.notes ?? "",
      });
    }
  }, [existing, form]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      if (isEdit && existing) {
        await moodApi.update(existing.id, values);
        toast.success("Mood entry updated.");
      } else {
        await moodApi.create(values);
        toast.success("Mood logged successfully.");
      }
      router.push("/mood/history");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const notesValue = form.watch("notes") ?? "";

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Mood Entry" : "Log Your Mood"}</CardTitle>
        {isEdit && existing && (
          <p className="text-sm text-muted-foreground">
            Logged at: {new Date(existing.loggedAt).toLocaleString()} (read-only)
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Mood Score */}
            <FormField
              control={form.control}
              name="moodScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mood Score (1 = very low, 5 = excellent)</FormLabel>
                  <FormControl>
                    <ScoreButtons
                      label="Mood"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mood Label */}
            <FormField
              control={form.control}
              name="moodLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How would you describe your mood?</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {(["Happy", "Anxious", "Stressed", "Sad", "Calm", "Bored"] as const).map(
                      (label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => field.onChange(label)}
                          className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                            field.value === label
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:bg-secondary"
                          }`}
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stress Level */}
            <FormField
              control={form.control}
              name="stressLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stress Level (1 = calm, 5 = very stressed)</FormLabel>
                  <FormControl>
                    <ScoreButtons label="Stress" value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Energy Level */}
            <FormField
              control={form.control}
              name="energyLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Energy Level (1 = exhausted, 5 = very energetic)</FormLabel>
                  <FormControl>
                    <ScoreButtons label="Energy" value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sleep Hours */}
            <FormField
              control={form.control}
              name="sleepHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sleep Hours (previous night)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      min={0}
                      max={24}
                      className="w-28"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Workload */}
            <FormField
              control={form.control}
              name="workload"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workload Today</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notes{" "}
                    <span className="text-muted-foreground font-normal text-xs">
                      (optional, {notesValue.length}/500)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any context you want to note…"
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving…" : isEdit ? "Save Changes" : "Log Mood"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/mood/history")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
