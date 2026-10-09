import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, Clock, KeyRound, Loader2, Mail, MailCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { IconInput, PasswordInput } from "@/features/auth/AuthInputs";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { homePathFor } from "@/lib/session";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  accountName: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type RegisterValues = z.infer<typeof registerSchema>;

const NEXT_STEPS = [
  { icon: MailCheck, text: "Your request is with the StorageBox administrator." },
  { icon: Clock, text: "They approve it and choose your storage space." },
  { icon: KeyRound, text: "Sign in, create API keys and start uploading." },
];

function RequestReceived({ email }: { email: string }) {
  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200">
        <CheckCircle2 className="size-6 shrink-0" />
        <p className="text-base">
          Request sent for <span className="font-semibold break-all">{email}</span>
        </p>
      </div>
      <ol className="grid gap-4">
        {NEXT_STEPS.map(({ icon: Icon, text }, index) => (
          <li key={text} className="flex items-center gap-3 text-base text-slate-700">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600">
              <Icon className="size-4" />
            </span>
            <span>
              <span className="font-semibold text-slate-900">{index + 1}.</span> {text}
            </span>
          </li>
        ))}
      </ol>
      <Button className="h-12 rounded-lg text-base" render={<Link to="/login" />}>
        Back to sign in
      </Button>
    </div>
  );
}

export default function RegisterPage() {
  const { register: registerAccount, isAuthenticated, user } = useAuth();
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", accountName: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  if (isAuthenticated) return <Navigate to={homePathFor(user)} replace />;

  if (requestedEmail) {
    return (
      <AuthLayout title="Request received" subtitle="Thanks! We'll let you in as soon as your account is approved.">
        <RequestReceived email={requestedEmail} />
      </AuthLayout>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await registerAccount({ ...values, accountName: values.accountName || undefined });
      setRequestedEmail(result.email);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your request");
    }
  });

  return (
    <AuthLayout title="Request an account" subtitle="Tell us who you are. An administrator approves new accounts and sets your storage.">
      <form className="grid gap-5" onSubmit={onSubmit} noValidate>
        <div className="grid gap-5">
          <FormField label="Your name" htmlFor="name" error={errors.name?.message}>
            <IconInput icon={UserRound} id="name" autoComplete="name" placeholder="Jane Doe" {...form.register("name")} />
          </FormField>
          <FormField label="Company or project" htmlFor="accountName" error={errors.accountName?.message}>
            <IconInput icon={Building2} id="accountName" placeholder="Optional" {...form.register("accountName")} />
          </FormField>
        </div>
        <FormField label="Work email" htmlFor="email" error={errors.email?.message}>
          <IconInput icon={Mail} id="email" type="email" autoComplete="email" placeholder="you@company.com" {...form.register("email")} />
        </FormField>
        <FormField label="Password" htmlFor="password" hint="At least 8 characters." error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" placeholder="Choose a password" {...form.register("password")} />
        </FormField>
        <Button type="submit" className="mt-2 h-12 rounded-lg text-base" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Send request
          {!isSubmitting && <ArrowRight />}
        </Button>
      </form>
      <div className="grid gap-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Already approved?
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="h-12 rounded-lg text-base" render={<Link to="/login" />}>
          Sign in
        </Button>
      </div>
    </AuthLayout>
  );
}
