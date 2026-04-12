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
import type { EatingLog, FoodCategory, MealType, PortionRating, TimeOfDay } from "@/types";

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

function OptionButton<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full px-3 py-1 text-sm border transition-colors ${
            value === opt
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-secondary"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
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

export function EatingForm({ existing, noLogsToday }: EatingFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!existing;

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
    if (existing) {
      form.reset({
        mealType: existing.mealType,
        foodCategory: existing.foodCategory,
        portionRating: existing.portionRating,
        hungerBefore: existing.hungerBefore,
        timeOfDay: existing.timeOfDay,
        description: existing.description ?? "",
      });
    }
  }, [existing, form]);

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
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Eating Entry" : "Log a Meal"}</CardTitle>
        {!isEdit && noLogsToday && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-md px-3 py-2 border border-amber-200">
            You haven&apos;t logged any meals today yet.
          </p>
        )}
        {isEdit && existing && (
          <p className="text-sm text-muted-foreground">
            Logged at: {new Date(existing.loggedAt).toLocaleString()} (read-only)
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="mealType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal Type</FormLabel>
                  <FormControl>
                    <OptionButton<MealType>
                      options={["Breakfast", "Lunch", "Dinner", "Snack", "Other"]}
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
                    <OptionButton<FoodCategory>
                      options={["Healthy", "Neutral", "Sugary", "Junk", "Skipped"]}
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
              name="portionRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Portion Size</FormLabel>
                  <FormControl>
                    <OptionButton<PortionRating>
                      options={["Small", "Normal", "Large", "Binge"]}
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
              name="hungerBefore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hunger Before Eating (1 = not hungry, 5 = very hungry)</FormLabel>
                  <FormControl>
                    <ScoreButtons
                      label="Hunger"
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
              name="timeOfDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time of Day</FormLabel>
                  <FormControl>
                    <OptionButton<TimeOfDay>
                      options={["Morning", "Afternoon", "Evening", "Night"]}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description{" "}
                    <span className="text-muted-foreground font-normal text-xs">
                      (optional, {descValue.length}/300)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What did you eat? Any notes…"
                      maxLength={300}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving…" : isEdit ? "Save Changes" : "Log Meal"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/eating/history")}
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
