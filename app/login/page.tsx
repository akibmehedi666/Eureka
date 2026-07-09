"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { login, signup } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function AuthForm() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (isSignUp) {
        const res = await signup(formData);
        if (res?.error) {
          toast.error(res.error);
        }
      } else {
        const res = await login(formData);
        if (res?.error) {
          toast.error(res.error);
        }
      }
    });
  };

  return (
    <main className="min-h-screen w-full bg-paper text-ink flex items-center justify-center p-4 selection:bg-accent/30">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="h-9 w-9 bg-accent-forest text-paper flex items-center justify-center rounded-sm font-mono font-bold text-lg">
            E!
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight">Eureka!</span>
        </div>

        {/* Auth Card */}
        <Card className="bg-paper border border-border shadow-[0_4px_24px_rgba(28,31,38,0.04)] rounded-none relative overflow-hidden">
          {/* Notebook binder edge simulation */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-accent-forest/10 border-r border-border/60" />
          
          <CardHeader className="pl-8 pt-8 pb-4">
            <CardTitle className="font-serif text-3xl font-bold tracking-tight text-ink">
              {isSignUp ? "Create Account" : "Log In"}
            </CardTitle>
            <CardDescription className="font-mono text-xs text-ink-muted uppercase tracking-wider mt-1.5">
              {isSignUp ? "Create your workspace to get started" : "Access your workspace"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pl-8 pr-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="font-mono text-xs text-ink-muted uppercase">Full Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    type="text" 
                    required 
                    placeholder="Eleanor Vance" 
                    disabled={isPending}
                    className="bg-paper border-border focus:border-accent focus:ring-accent rounded-none h-10 px-3 font-sans placeholder:text-ink-muted/50"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-mono text-xs text-ink-muted uppercase">Email address</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="eleanor.v@eureka.edu" 
                  disabled={isPending}
                  className="bg-paper border-border focus:border-accent focus:ring-accent rounded-none h-10 px-3 font-sans placeholder:text-ink-muted/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-mono text-xs text-ink-muted uppercase">Password</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  disabled={isPending}
                  className="bg-paper border-border focus:border-accent focus:ring-accent rounded-none h-10 px-3 font-sans placeholder:text-ink-muted/50"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isPending}
                className="w-full bg-ink hover:bg-ink-muted text-paper transition-all rounded-none font-serif text-md font-medium h-11 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-paper" />
                ) : isSignUp ? (
                  <>Create Account</>
                ) : (
                  <>Log In</>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pl-8 pr-6 py-4 bg-border/20 border-t border-border flex justify-center gap-1.5 text-xs text-ink-muted">
            <span>{isSignUp ? "Already have an account?" : "Don't have an account?"}</span>
            <button 
              onClick={() => setIsSignUp(!isSignUp)} 
              className="text-accent-forest hover:text-accent font-semibold underline cursor-pointer"
            >
              {isSignUp ? "Log In" : "Sign Up"}
            </button>
          </CardFooter>
        </Card>

        {/* Small brand footer */}
        <p className="font-mono text-[11px] text-ink-muted text-center px-4 leading-relaxed">
          A shared space for your research library.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-paper text-ink flex items-center justify-center font-mono text-[11px] uppercase tracking-widest">
        Loading...
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
