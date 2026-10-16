import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authQuery } from "@/lib/queries";
import { authService } from "@/services";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Hours" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: auth } = useQuery({ ...authQuery(), enabled: typeof window !== "undefined" });
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () => authService.login(password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      await navigate({ to: "/" });
    },
  });

  useEffect(() => {
    if (auth?.authenticated) void navigate({ to: "/" });
  }, [auth?.authenticated, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        className="w-full max-w-xs rounded-md border border-border bg-surface p-5 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (password) login.mutate();
        }}
      >
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-[6px] bg-primary text-primary-foreground">
            <LockKeyhole className="size-4" />
          </span>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Hours</h1>
            <p className="text-[11px] text-muted-foreground">Private time tracker</p>
          </div>
        </div>
        <Input
          autoFocus
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="h-10 border-border bg-background"
        />
        {login.isError && (
          <p className="mt-2 text-xs text-destructive">The password was not accepted.</p>
        )}
        <Button
          type="submit"
          className="mt-3 h-9 w-full bg-primary text-primary-foreground hover:bg-primary-hover"
          disabled={!password || login.isPending}
        >
          {login.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          Sign in
        </Button>
      </form>
    </div>
  );
}
