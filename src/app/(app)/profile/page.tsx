"use client";

import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/services/auth";
import { User, Lock, Trash2 } from "lucide-react";

// ─── Profile name form ───────────────────────────────────────────────────────

const nameSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
});
type NameValues = z.infer<typeof nameSchema>;

function ProfileSection() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<NameValues>({
    resolver: zodResolver(nameSchema) as Resolver<NameValues>,
    defaultValues: { displayName: user?.displayName ?? "" },
  });

  const onSubmit = async (values: NameValues) => {
    setIsLoading(true);
    try {
      await authApi.updateProfile({ displayName: values.displayName });
      await refreshUser();
      toast.success("Display name updated.");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4" /> Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Email (read-only)</p>
          <p className="text-sm">{user?.email}</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input className="max-w-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? "Saving…" : "Save Name"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── Password form ────────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(/\d/, "New password must contain at least one number"),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

function PasswordSection() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema) as Resolver<PasswordValues>,
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const onSubmit = async (values: PasswordValues) => {
    setIsLoading(true);
    try {
      await authApi.updateProfile({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Password changed successfully.");
      form.reset();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to change password.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" /> Change Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 max-w-sm">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? "Changing…" : "Change Password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerZone() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const canDelete = confirmEmail.trim().toLowerCase() === user?.email?.toLowerCase();

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await authApi.deleteAccount();
      await logout();
      router.replace("/register");
      toast.success("Account deleted. All your data has been erased.");
    } catch {
      toast.error("Failed to delete account.");
    } finally {
      setIsDeleting(false);
      setOpen(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <Trash2 className="h-4 w-4" /> Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This action is irreversible.
        </p>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20">
            Delete Account
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                All your mood logs, eating logs, and account data will be permanently erased.
                This cannot be undone.
                <br />
                <br />
                Type your email address <strong>{user?.email}</strong> to confirm:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              type="email"
              placeholder={user?.email}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="mt-2"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmEmail("")}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!canDelete || isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete My Account"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile & Settings</h1>
      <ProfileSection />
      <Separator />
      <PasswordSection />
      <Separator />
      <DangerZone />
    </div>
  );
}
