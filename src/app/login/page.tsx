"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import { Brain } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setLockoutMessage(null);
    try {
      const res = await authApi.login(values);
      login(res.data.data.token, res.data.data.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string; retryAfter?: string } } };
      if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retryAfter;
        const msg = retryAfter
          ? `Account locked. Try again after ${new Date(retryAfter).toLocaleTimeString()}.`
          : "Account locked for 15 minutes due to too many failed attempts.";
        setLockoutMessage(msg);
      } else {
        toast.error(error.response?.data?.message ?? "Invalid email or password.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Log in to view your patterns</CardDescription>
        </CardHeader>
        <CardContent>
          {lockoutMessage && (
            <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              {lockoutMessage}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in…" : "Log In"}
              </Button>
            </form>
          </Form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline text-primary">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
