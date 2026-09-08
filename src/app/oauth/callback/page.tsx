"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain } from "lucide-react";
import { authApi } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(() => searchParams.get("error"));

  useEffect(() => {
    const run = async () => {
      if (searchParams.get("oauth") !== "success") {
        if (!searchParams.get("error")) {
          setError("OAuth sign-in could not be completed.");
        }
        return;
      }

      try {
        const res = await authApi.completeOAuth();
        login(res.data.data.token, res.data.data.user, res.data.data.refreshToken);
        router.replace("/dashboard");
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "OAuth login failed. Please try again.";
        setError(msg);
      }
    };

    void run();
  }, [login, router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-background p-6 text-center">
        <div className="mb-4 flex justify-center">
          <span className="rounded-md bg-foreground p-1.5 text-background">
            <Brain className="h-4 w-4" />
          </span>
        </div>

        {!error ? (
          <>
            <h1 className="text-xl font-semibold">Completing sign in...</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please wait while we finish your Google sign-in.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Sign in failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <div className="mt-4">
              <Link href="/login" className="underline underline-offset-4">Back to login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 text-center">
            <h1 className="text-xl font-semibold">Completing sign in...</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please wait while we finish your Google sign-in.</p>
          </div>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
