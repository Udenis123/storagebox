import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Clock, Loader2, Mail, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ACCOUNT_PENDING_CODE, ACCOUNT_REJECTED_CODE } from "@/features/auth/api";
import { IconInput, PasswordInput } from "@/features/auth/AuthInputs";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { ApiRequestError } from "@/lib/api";
import { homePathFor, safeReturnPath } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;
type BlockedReason = "pending" | "rejected" | null;

function BlockedNotice({ reason }: { reason: Exclude<BlockedReason, null> }) {
  const isPending = reason === "pending";
  const Icon = isPending ? Clock : XCircle;
  return (
    <div
      role="status"
      className={`flex gap-3 rounded-xl p-4 ring-1 ${isPending ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-rose-50 text-rose-900 ring-rose-200"}`}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="grid gap-1">
        <p className="font-semibold">{isPending ? "Your account is waiting for approval" : "Your request was not approved"}</p>
        <p className="text-sm opacity-90">
          {isPending
            ? "An administrator reviews every new account. You can sign in as soon as it is approved."
            : "Please contact the StorageBox administrator if you think this is a mistake."}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnPath(params.get("callbackUrl"));
  const [blocked, setBlocked] = useState<BlockedReason>(null);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  if (isAuthenticated) return <Navigate to={returnTo ?? homePathFor(user)} replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    setBlocked(null);
    try {
      const profile = await login(values);
      navigate(returnTo ?? homePathFor(profile), { replace: true });
    } catch (error) {
      const code = error instanceof ApiRequestError ? error.errorCode : undefined;
      if (code === ACCOUNT_PENDING_CODE) return setBlocked("pending");
      if (code === ACCOUNT_REJECTED_CODE) return setBlocked("rejected");
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    }
  });

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your StorageBox account to manage files, links and API keys.">
      {blocked && <BlockedNotice reason={blocked} />}
      <form className="grid gap-5" onSubmit={onSubmit} noValidate>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <IconInput icon={Mail} id="email" type="email" autoComplete="email" placeholder="you@company.com" {...form.register("email")} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="current-password" placeholder="Your password" {...form.register("password")} />
        </FormField>
        <Button type="submit" className="mt-2 h-12 rounded-lg text-base" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Sign in
          {!isSubmitting && <ArrowRight />}
        </Button>
      </form>
      <div className="grid gap-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          New to StorageBox?
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="h-12 rounded-lg text-base" render={<Link to="/register" />}>
          Request an account
        </Button>
      </div>
    </AuthLayout>
  );
}
