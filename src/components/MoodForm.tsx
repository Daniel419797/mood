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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { moodApi } from "@/services/mood";
import type { MoodLog } from "@/types";
import { Check, CircleHelp } from "lucide-react";

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

function SliderRow({
  label,
  value,
  onChange,
  low,
  high,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  low: string;
  high: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium">{label}</p>
        <span className="text-xs text-muted-foreground">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full accent-foreground"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

export function MoodForm({ existing }: MoodFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = Boolean(existing);

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
    if (!existing) return;
    form.reset({
      moodScore: existing.moodScore,
      moodLabel: existing.moodLabel,
      stressLevel: existing.stressLevel,
      energyLevel: existing.energyLevel,
      sleepHours: existing.sleepHours,
      workload: existing.workload,
      notes: existing.notes ?? "",
    });
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
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-5xl">How are you feeling?</h1>
        <p className="mt-2 text-muted-foreground">
          Capturing your emotional state helps identify patterns in your eating habits.
        </p>
        {isEdit && existing && (
          <p className="mt-2 text-sm text-muted-foreground">
            Logged at: {new Date(existing.loggedAt).toLocaleString()} (read-only)
          </p>
        )}
      </div>

      <Form {...form}>
        <form id="mood-entry-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pb-20">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Mood & Intensity</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select the label that best describes your current state and its intensity.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="moodLabel"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {(["Happy", "Calm", "Anxious", "Stressed", "Sad", "Bored"] as const).map((label) => {
                        const selected = field.value === label;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => field.onChange(label)}
                            className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                              selected
                                ? "bg-foreground text-background border-foreground"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moodScore"
                render={({ field }) => (
                  <FormItem>
                    <SliderRow
                      label="Mood Score (1-5)"
                      value={field.value}
                      onChange={field.onChange}
                      low="Low"
                      high="High"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Stress & Energy</CardTitle>
                <p className="text-sm text-muted-foreground">Current physiological levels.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField
                  control={form.control}
                  name="stressLevel"
                  render={({ field }) => (
                    <FormItem>
                      <SliderRow
                        label="Stress Level"
                        value={field.value}
                        onChange={field.onChange}
                        low="Low"
                        high="High"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="energyLevel"
                  render={({ field }) => (
                    <FormItem>
                      <SliderRow
                        label="Energy Level"
                        value={field.value}
                        onChange={field.onChange}
                        low="Low"
                        high="High"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Sleep & Work</CardTitle>
                <p className="text-sm text-muted-foreground">External factor tracking.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="sleepHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sleep Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min={0}
                          max={24}
                          placeholder="e.g. 7.5"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workload"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workload</FormLabel>
                      <div className="flex gap-2">
                        {(["Low", "Medium", "High"] as const).map((label) => {
                          const selected = field.value === label;
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => field.onChange(label)}
                              className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-4 text-sm transition-colors ${
                                selected
                                  ? "bg-foreground text-background border-foreground"
                                  : "border-border hover:bg-muted"
                              }`}
                            >
                              {selected ? <Check className="h-3.5 w-3.5" /> : null}
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Additional Notes</CardTitle>
              <p className="text-sm text-muted-foreground">Any specific events or feelings contributing to your mood today?</p>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Optional: Describe your day..."
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CircleHelp className="h-3.5 w-3.5" />
                        Optional
                      </span>
                      <span>{notesValue.length} / 500 characters</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="fixed bottom-5 right-5 z-20">
            <Button type="submit" disabled={isLoading} className="h-12 px-6 text-sm font-semibold">
              {isLoading ? "Saving..." : isEdit ? "Save Entry" : "Complete Log"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
