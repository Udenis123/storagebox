import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { CopyField } from "@/components/shared/CopyField";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { PageHeader, SectionTitle } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { changePassword, updateProfile } from "@/features/auth/api";
import { StoragePlanCard } from "@/features/storage/StorageAlerts";
import { useApiMutation } from "@/hooks/useApiMutation";
import { API_BASE_URL } from "@/lib/constants";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  accountName: z.string().trim().min(1, "Enter an account name"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

const CARD = "grid gap-5 rounded-xl border bg-card p-4 sm:p-6";

function ProfileForm() {
  const { user, setUser } = useAuth();
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", accountName: user?.account.name ?? "" },
  });
  const save = useApiMutation(updateProfile, { onSuccess: setUser });
  const { errors } = form.formState;
  return (
    <form className={CARD} onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <SectionTitle>Profile</SectionTitle>
      <FormField label="Your name" htmlFor="profile-name" error={errors.name?.message}>
        <Input id="profile-name" className={INPUT_CLASS} {...form.register("name")} />
      </FormField>
      <FormField label="Account name" htmlFor="profile-account" error={errors.accountName?.message}>
        <Input id="profile-account" className={INPUT_CLASS} {...form.register("accountName")} />
      </FormField>
      <FormField label="Email" htmlFor="profile-email">
        <Input id="profile-email" value={user?.email ?? ""} disabled className={INPUT_CLASS} />
      </FormField>
      <Button type="submit" size="lg" className="w-fit" disabled={save.isPending}>
        {save.isPending && <Loader2 className="animate-spin" />}
        Save profile
      </Button>
    </form>
  );
}

function PasswordForm() {
  const { logout } = useAuth();
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const change = useApiMutation(changePassword, { onSuccess: () => void logout() });
  const { errors } = form.formState;
  return (
    <form className={CARD} onSubmit={form.handleSubmit(({ currentPassword, newPassword }) => change.mutate({ currentPassword, newPassword }))}>
      <SectionTitle>Change password</SectionTitle>
      <p className="-mt-3 text-sm text-muted-foreground">You will be signed out everywhere afterwards.</p>
      <FormField label="Current password" htmlFor="current-password" error={errors.currentPassword?.message}>
        <Input id="current-password" type="password" autoComplete="current-password" className={INPUT_CLASS} {...form.register("currentPassword")} />
      </FormField>
      <FormField label="New password" htmlFor="new-password" error={errors.newPassword?.message}>
        <Input id="new-password" type="password" autoComplete="new-password" className={INPUT_CLASS} {...form.register("newPassword")} />
      </FormField>
      <FormField label="Confirm new password" htmlFor="confirm-password" error={errors.confirmPassword?.message}>
        <Input id="confirm-password" type="password" autoComplete="new-password" className={INPUT_CLASS} {...form.register("confirmPassword")} />
      </FormField>
      <Button type="submit" size="lg" className="w-fit" disabled={change.isPending}>
        {change.isPending && <Loader2 className="animate-spin" />}
        Change password
      </Button>
    </form>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const cloudName = user?.account.cloudName ?? "";
  return (
    <>
      <PageHeader title="Settings" description="Your profile, storage plan and security." />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="grid content-start gap-6">
          <section className={CARD}>
            <SectionTitle>Cloud</SectionTitle>
            <CopyField label="Cloud name" value={cloudName} />
            <CopyField label="Delivery base URL" value={`${API_BASE_URL}/f/${cloudName}`} />
            <CopyField label="API base URL" value={`${API_BASE_URL}/v1`} />
          </section>
          <ProfileForm />
        </div>
        <div className="grid content-start gap-6">
          <StoragePlanCard />
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
