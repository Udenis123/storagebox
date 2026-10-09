import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { safeReturnPath } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnPath(params.get("callbackUrl"));
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  if (isAuthenticated) return <Navigate to={returnTo} replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values);
      navigate(returnTo, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    }
  });

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your files, links and API keys.">
      <form className="grid gap-5" onSubmit={onSubmit} noValidate>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" className={INPUT_CLASS} {...form.register("email")} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" className={INPUT_CLASS} {...form.register("password")} />
        </FormField>
        <Button type="submit" className="h-12 text-base" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Sign in
        </Button>
      </form>
      <p className="text-center text-base text-muted-foreground">
        New to StorageBox?{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Create a free account
        </Link>
      </p>
    </AuthLayout>
  );
}
