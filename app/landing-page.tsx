import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, PenLine, Users, LayoutDashboard } from "lucide-react";

interface LandingPageProps {
  user?: any;
}

export default function LandingPage({ user }: LandingPageProps) {
  return (
    <main className="min-h-screen w-full bg-paper text-ink flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden selection:bg-accent/35">
      {/* Decorative notebook spine line */}
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-accent-forest/10 border-r border-border" />
      
      <div className="max-w-2xl w-full text-center space-y-10 pl-6 relative">
        {/* Eyebrow */}
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted/80 block">
          Track papers · Take notes · Work with your team
        </span>

        {/* Headline Wordmark */}
        <div className="space-y-3">
          <h1 className="font-serif text-7xl md:text-8xl font-bold tracking-tight text-ink relative inline-block select-none">
            Eureka!
            {/* Highlighter Amber Underline */}
            <span className="absolute bottom-2 left-0 right-0 h-3 bg-accent/20 -z-10 transform -rotate-1" />
          </h1>
          
          {/* Tagline */}
          <p className="font-serif italic text-lg md:text-xl text-ink-muted/90 max-w-lg mx-auto leading-relaxed">
            Your shared library for research papers — read, annotate, and collaborate with your team.
          </p>
        </div>

        {/* Clean divider */}
        <div className="w-16 h-px bg-border mx-auto" />

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto">
          {user ? (
            <Button
              render={
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
              className="w-full bg-ink hover:bg-ink-muted text-paper transition-all rounded-none font-serif text-base h-12 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            />
          ) : (
            <>
              <Button
                render={
                  <Link href="/login?mode=signup">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                }
                className="w-full bg-ink hover:bg-ink-muted text-paper transition-all rounded-none font-serif text-base h-12 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              />
              
              <Button
                render={
                  <Link href="/login?mode=login">
                    Log In
                  </Link>
                }
                variant="outline"
                className="w-full border-border bg-paper hover:bg-border/20 text-ink rounded-none font-sans text-sm h-12 flex items-center justify-center cursor-pointer"
              />
            </>
          )}
        </div>

        {/* Onboarding Steps */}
        <div className="pt-6 text-left">
          <p className="font-mono text-[10px] text-ink-muted/70 uppercase tracking-widest text-center mb-5">How it works</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: BookOpen, step: "1", title: "Add a paper", desc: "Upload a PDF or paste an arXiv/DOI link." },
              { icon: PenLine, step: "2", title: "Take notes", desc: "Write a summary, key findings, and questions." },
              { icon: Users, step: "3", title: "Invite your team", desc: "Share your workspace and work together." },
              { icon: LayoutDashboard, step: "4", title: "See progress", desc: "Track what everyone is reading in one place." },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="flex flex-col gap-2 p-4 border border-border/60 bg-paper/60 relative">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-ink-muted/60 uppercase">{step}</span>
                  <Icon className="h-3.5 w-3.5 text-accent-forest" />
                </div>
                <p className="font-serif text-sm font-bold text-ink leading-tight">{title}</p>
                <p className="font-mono text-[10px] text-ink-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
