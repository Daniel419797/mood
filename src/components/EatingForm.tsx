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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { eatingApi } from "@/services/eating";
import type { EatingLog } from "@/types";
import { Check, CircleHelp } from "lucide-react";

const schema = z.object({
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Other"]),
  foodCategory: z.enum(["Healthy", "Neutral", "Sugary", "Junk", "Skipped"]),
  portionRating: z.enum(["Small", "Normal", "Large", "Binge"]),
  hungerBefore: z.coerce.number().int().min(1).max(5),
  timeOfDay: z.enum(["Morning", "Afternoon", "Evening", "Night"]),
  description: z.string().max(300).optional(),
});

type FormValues = z.infer<typeof schema>;

interface EatingFormProps {
  existing?: EatingLog;
  noLogsToday?: boolean;
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
  gridCols = "grid-cols-2 md:grid-cols-3",
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  gridCols?: string;
}) {
  return (
    <div className={`grid gap-2 ${gridCols}`}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
              selected
                ? "bg-foreground text-background border-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
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

export function EatingForm({ existing, noLogsToday }: EatingFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = Boolean(existing);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      mealType: "Breakfast",
      foodCategory: "Healthy",
      portionRating: "Normal",
      hungerBefore: 3,
      timeOfDay: "Morning",
      description: "",
    },
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      mealType: existing.mealType,
      foodCategory: existing.foodCategory,
      portionRating: existing.portionRating,
      hungerBefore: existing.hungerBefore,
      timeOfDay: existing.timeOfDay,
      description: existing.description ?? "",
    });
  }, [existing, form]);

  const selectedFoodCategory = form.watch("foodCategory");
  const isSkippedMeal = selectedFoodCategory === "Skipped";

  useEffect(() => {
    if (!isSkippedMeal) return;
    form.setValue("portionRating", "Small", { shouldValidate: true });
  }, [isSkippedMeal, form]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      if (isEdit && existing) {
        await eatingApi.update(existing.id, values);
        toast.success("Eating entry updated.");
      } else {
        await eatingApi.create(values);
        toast.success("Meal logged successfully.");
      }
      router.push("/eating/history");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const descValue = form.watch("description") ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-5xl">What did you eat?</h1>
        <p className="mt-2 text-muted-foreground">
          Capturing your meal context helps uncover emotional and behavioral food patterns.
        </p>
        {!isEdit && noLogsToday && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            You have not logged any meals today yet.
          </p>
        )}
        {isEdit && existing && (
          <p className="mt-2 text-sm text-muted-foreground">
            Logged at: {new Date(existing.loggedAt).toLocaleString()} (read-only)
          </p>
        )}
      </div>

      <Form {...form}>
        <form id="eating-entry-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pb-20">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Meal Context</CardTitle>
              <p className="text-sm text-muted-foreground">Describe the meal and category first.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="mealType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meal Type</FormLabel>
                    <FormControl>
                      <PillGroup
                        options={["Breakfast", "Lunch", "Dinner", "Snack", "Other"] as const}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="foodCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Food Category</FormLabel>
                    <FormControl>
                      <PillGroup
                        options={["Healthy", "Neutral", "Sugary", "Junk", "Skipped"] as const}
                        value={field.value}
                        onChange={field.onChange}
                        gridCols="grid-cols-2 md:grid-cols-5"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Hunger & Portion</CardTitle>
                <p className="text-sm text-muted-foreground">How hungry were you and how much did you eat?</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField
                  control={form.control}
                  name="hungerBefore"
                  render={({ field }) => (
                    <FormItem>
                      <SliderRow
                        label="Hunger Before Eating"
                        value={field.value}
                        onChange={field.onChange}
                        low="Not hungry"
                        high="Very hungry"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isSkippedMeal ? (
                  <FormField
                    control={form.control}
                    name="portionRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portion Rating</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {(["Small", "Normal", "Large", "Binge"] as const).map((label) => {
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
                ) : (
                  <p className="text-sm text-muted-foreground">Portion is not applicable when meal category is Skipped.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Time & Pattern</CardTitle>
                <p className="text-sm text-muted-foreground">Capture when the meal happened.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="timeOfDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time of Day</FormLabel>
                      <FormControl>
                        <PillGroup
                          options={["Morning", "Afternoon", "Evening", "Night"] as const}
                          value={field.value}
                          onChange={field.onChange}
                          gridCols="grid-cols-2 md:grid-cols-4"
                        />
                      </FormControl>
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
              <p className="text-sm text-muted-foreground">Optional details about your meal context.</p>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Optional: what did you eat, where were you, how were you feeling..."
                        maxLength={300}
                        {...field}
                      />
                    </FormControl>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CircleHelp className="h-3.5 w-3.5" />
                        Optional
                      </span>
                      <span>{descValue.length} / 300 characters</span>
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
