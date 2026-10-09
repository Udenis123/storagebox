import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/features/auth/AuthLayout";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  accountName: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerAccount, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", accountName: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await registerAccount({ ...values, accountName: values.accountName || undefined });
      toast.success("Welcome to StorageBox!");
      navigate("/library", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your account");
    }
  });

  return (
    <AuthLayout title="Create your account" subtitle="Free storage with links and API access in under a minute.">
      <form className="grid gap-5" onSubmit={onSubmit} noValidate>
        <FormField label="Your name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" className={INPUT_CLASS} {...form.register("name")} />
        </FormField>
        <FormField
          label="Company or project (optional)"
          htmlFor="accountName"
          hint="Used to create your cloud name, which appears in every file link."
          error={errors.accountName?.message}
        >
          <Input id="accountName" className={INPUT_CLASS} {...form.register("accountName")} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" className={INPUT_CLASS} {...form.register("email")} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" className={INPUT_CLASS} {...form.register("password")} />
        </FormField>
        <Button type="submit" className="h-12 text-base" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Create account
        </Button>
      </form>
      <p className="text-center text-base text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
