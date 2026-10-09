import { useState, type ComponentProps } from "react";
import { Eye, EyeOff, Lock, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const AUTH_INPUT_CLASS = "h-12 rounded-lg bg-background pl-11 text-base shadow-none";

type IconInputProps = ComponentProps<typeof Input> & { icon: LucideIcon };

export function IconInput({ icon: Icon, className, ...props }: IconInputProps) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-4 size-[1.1rem] -translate-y-1/2 text-muted-foreground" />
      <Input className={cn(AUTH_INPUT_CLASS, className)} {...props} />
    </div>
  );
}

export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute top-1/2 left-4 size-[1.1rem] -translate-y-1/2 text-muted-foreground" />
      <Input type={isVisible ? "text" : "password"} className={cn(AUTH_INPUT_CLASS, "pr-12", className)} {...props} />
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={isVisible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {isVisible ? <EyeOff className="size-[1.1rem]" /> : <Eye className="size-[1.1rem]" />}
      </button>
    </div>
  );
}
