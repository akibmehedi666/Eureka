"use client";

import React, { useState, useMemo, useTransition } from "react";

import { updatePaperStatus, updatePaperDetails, saveNotes, deletePaper } from "../../actions";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  ArrowLeft, ExternalLink,
  ArrowUpRight, User, Eye, PenLine, Moon, Sun, 
  Edit, Save, Trash2, AlertTriangle
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PaperStatus } from "@prisma/client";

interface Note {
  id: string;
  summary: string | null;
  keyFindings: string | null;
  openQuestions: string | null;
  relevance: string | null;
  freeform: string | null;
}

interface PaperDetails {
  id: string;
  title: string;
  authors: string;
  year: number | null;
  sourceUrl: string | null;
  fileUrl: string | null;
  status: PaperStatus;
  createdAt: Date;
  workspaceId: string;
  addedById: string;
  notes: Note[];
}

interface PaperDetailViewProps {
  paper: PaperDetails;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  canDelete: boolean;
}

export default function PaperDetailView({ paper: initialPaper, user, canDelete }: PaperDetailViewProps) {
  const [paper, setPaper] = useState<PaperDetails>(initialPaper);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [activeNoteTab, setActiveNoteTab] = useState<"read" | "write">("read");
  const [isPending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Memoized: avoid re-deriving on every render caused by status/theme changes
  const selectedNote = useMemo(() => paper.notes?.[0] || null, [paper.notes]);

  const handleStatusChange = async (status: PaperStatus) => {
    const res = await updatePaperStatus(paper.id, status);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Reading status set to ${status.replace("_", " ")}`);
      setPaper(prev => ({ ...prev, status }));
    }
  };

  const handleSaveMetadata = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("paperId", paper.id);

    startTransition(async () => {
      const res = await updatePaperDetails(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Document metadata updated.");
        setIsEditingMetadata(false);
        setPaper(prev => ({
          ...prev,
          title: formData.get("title") as string || "Untitled Document",
          authors: formData.get("authors") as string || "Unknown Author",
          year: formData.get("year") ? parseInt(formData.get("year") as string, 10) : null,
          sourceUrl: formData.get("sourceUrl") as string || null,
        }));
      }
    });
  };

  const handleSaveNotes = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("paperId", paper.id);

    startTransition(async () => {
      const res = await saveNotes(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Notes saved.");
        setActiveNoteTab("read");
        
        const updatedNotes = {
          id: selectedNote?.id || crypto.randomUUID(),
          summary: formData.get("summary") as string,
          keyFindings: formData.get("keyFindings") as string,
          openQuestions: formData.get("openQuestions") as string,
          relevance: formData.get("relevance") as string,
          freeform: formData.get("freeform") as string,
        };

        setPaper(prev => ({
          ...prev,
          notes: [updatedNotes]
        }));
      }
    });
  };

  const handleDeletePaper = () => {
    if (!window.confirm("Are you sure you want to delete this paper? This will also remove its notes, comments, and tags.")) {
      return;
    }

    startTransition(async () => {
      const res = await deletePaper(paper.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Paper deleted.");
        router.push(`/dashboard/${paper.workspaceId}`);
      }
    });
  };

  const getStatusColor = (status: PaperStatus) => {
    switch (status) {
      case "TO_READ": return "bg-border text-ink-muted border-border/80";
      case "READING": return "bg-accent/15 text-accent border-accent/30 font-semibold";
      case "DONE": return "bg-accent-forest/15 text-accent-forest border-accent-forest/30 font-semibold";
      case "REFERENCE": return "font-mono text-ink-muted/80 bg-border/40 border-border/60";
    }
  };

  return (
    <div className="min-h-screen w-full bg-paper text-ink selection:bg-accent/35 flex flex-col font-sans">
      
      {/* Premium Header */}
      <header className="border-b border-border py-4 px-6 md:px-8 bg-paper flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link 
            href={`/dashboard/${paper.workspaceId}`}
            className="p-1.5 hover:bg-border/20 border border-transparent hover:border-border transition-all flex items-center justify-center text-ink rounded-none cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="font-serif text-lg font-bold tracking-tight">Eureka!</span>
          <span className="text-border">|</span>
          <span className="font-mono text-xs uppercase text-ink-muted">Paper Details</span>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-ink-muted hover:text-ink cursor-pointer hover:bg-border/20 rounded-none h-8 w-8"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Link
            href="/profile"
            className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-border/20 border border-transparent hover:border-border transition-all rounded-none cursor-pointer"
          >
            <div className="h-6 w-6 rounded-none bg-accent/20 border border-border overflow-hidden flex items-center justify-center">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-3.5 w-3.5 text-ink-muted" />
              )}
            </div>
            <span className="font-mono text-xs uppercase tracking-wide hidden md:inline text-ink/80">{user.name}</span>
          </Link>
        </div>
      </header>

      {/* Main split details view */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* LEFT COLUMN: Metadata Edit and Source Links (60% width) */}
        <div className="flex-1 flex flex-col border-r border-border bg-paper min-w-[55%] p-6 md:p-10 overflow-y-auto">
          
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 border text-[10px] font-mono uppercase tracking-wider rounded-none ${getStatusColor(paper.status)}`}>
                {paper.status.replace("_", " ")}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDeletePaper}
                  disabled={isPending}
                  className="h-8 rounded-none border border-destructive/30 px-3 hover:bg-destructive/10 text-destructive font-mono text-[10px] uppercase cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              )}
              {paper.sourceUrl && (
                <a 
                  href={paper.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-border hover:bg-border/20 text-xs font-mono uppercase tracking-wide text-ink cursor-pointer transition-all"
                >
                  Source Link
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {paper.fileUrl && (
                <a 
                  href={paper.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-accent-forest text-paper hover:bg-accent-forest/90 text-xs font-mono uppercase tracking-wide cursor-pointer transition-all"
                >
                  Open PDF
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Form / Metadata presentation */}
          {isEditingMetadata ? (
            <form onSubmit={handleSaveMetadata} className="space-y-6 max-w-xl">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="font-mono text-[10px] text-ink-muted uppercase">Document Title</Label>
                <Input 
                  id="title" 
                  name="title" 
                  defaultValue={paper.title} 
                  required 
                  className="bg-paper border-border focus:border-accent focus:ring-accent rounded-none h-11"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="authors" className="font-mono text-[10px] text-ink-muted uppercase">Authors</Label>
                  <Input 
                    id="authors" 
                    name="authors" 
                    defaultValue={paper.authors} 
                    required 
                    className="bg-paper border-border focus:border-accent focus:ring-accent rounded-none h-11"
                  />
                </div>
                <div className="col-span-1 space-y-1.5">
                  <Label htmlFor="year" className="font-mono text-[10px] text-ink-muted uppercase">Year</Label>
                  <Input 
                    id="year" 
                    name="year" 
                    type="number" 
                    defaultValue={paper.year || ""} 
                    className="bg-paper border-border focus:border-accent focus:ring-accent rounded-none h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sourceUrl" className="font-mono text-[10px] text-ink-muted uppercase">Reference URL / Link</Label>
                <Input 
                  id="sourceUrl" 
                  name="sourceUrl" 
                  type="url" 
                  defaultValue={paper.sourceUrl || ""} 
                  className="bg-paper border-border focus:border-accent focus:ring-accent rounded-none h-11"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditingMetadata(false)} 
                  className="border-border rounded-none font-mono text-xs uppercase h-10 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="bg-ink hover:bg-ink-muted text-paper transition-all rounded-none font-serif text-sm h-10 px-6 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  Save Details
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-8 flex-1">
              <div className="space-y-3">
                <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/80 block">Title</span>
                <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-ink leading-tight">
                  {paper.title}
                </h1>

                {/* Metadata-incomplete callout: shown when IEEE or other blocked sources return fallback placeholders */}
                {(paper.title.toLowerCase().startsWith("document from") || paper.authors === "Unknown Author") && (
                  <div className="flex items-start gap-2.5 border border-accent/40 bg-accent/5 px-3 py-2.5 rounded-none max-w-xl">
                    <AlertTriangle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] text-accent font-semibold uppercase tracking-wider">Metadata not extracted automatically</p>
                      <p className="font-sans text-xs text-ink-muted mt-0.5 leading-relaxed">
                        This link (e.g. IEEE Xplore) blocks automatic scraping. Please click{" "}
                        <button
                          type="button"
                          onClick={() => setIsEditingMetadata(true)}
                          className="font-semibold text-accent-forest underline underline-offset-2 cursor-pointer"
                        >
                          Edit Details
                        </button>
                        {" "}to set the correct title, authors, and year.
                      </p>
                    </div>
                  </div>
                )}

                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditingMetadata(true)}
                  className="h-8 rounded-none border border-border/80 px-3 hover:bg-border/20 text-ink-muted hover:text-ink font-mono text-[10px] uppercase cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Edit className="h-3 w-3" />
                  Edit Details
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6 py-5 border-y border-border/80 max-w-2xl">
                <div className="space-y-1">
                  <span className="font-mono text-[10px] text-ink-muted uppercase block">Authors</span>
                  <span className="text-sm font-sans text-ink/95 leading-normal">{paper.authors}</span>
                </div>
                
                <div className="space-y-1">
                  <span className="font-mono text-[10px] text-ink-muted uppercase block">Year</span>
                  <span className="text-sm font-mono text-ink/90 leading-normal">{paper.year || "Unknown"}</span>
                </div>
              </div>

              {/* Status Modifier options */}
              <div className="space-y-2.5">
                <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider block">Reading Status</span>
                <div className="flex flex-wrap gap-2">
                  {(["TO_READ", "READING", "DONE", "REFERENCE"] as PaperStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`px-3 py-1.5 border text-xs font-mono uppercase tracking-wider transition-all rounded-none cursor-pointer ${
                        paper.status === status
                          ? getStatusColor(status) + " ring-1 ring-offset-2 ring-accent/30 font-semibold"
                          : "bg-paper text-ink-muted border-border/40 hover:bg-border/20"
                      }`}
                    >
                      {status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Signature Lined Notebook Annotations (40% width) */}
        <div className="w-full md:w-[42%] flex flex-col bg-[#FDFBF7] dark:bg-[#15171D] border-t md:border-t-0 border-border select-text">
          
          {/* Lined Notebook Header */}
          <div className="border-b border-border bg-paper/95 px-6 py-3.5 flex items-center justify-between z-10 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="font-serif text-sm font-bold tracking-tight text-ink">Notes</span>
            </div>
            
            <div className="flex gap-1 border border-border p-0.5 bg-border/20 rounded-none">
              <button
                onClick={() => setActiveNoteTab("read")}
                className={`px-2.5 py-1 font-mono text-[10px] uppercase flex items-center gap-1 transition-all rounded-none cursor-pointer ${
                  activeNoteTab === "read" ? "bg-paper text-ink border border-border shadow-sm font-bold" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Eye className="h-3 w-3" />
                Read
              </button>
              <button
                onClick={() => setActiveNoteTab("write")}
                className={`px-2.5 py-1 font-mono text-[10px] uppercase flex items-center gap-1 transition-all rounded-none cursor-pointer ${
                  activeNoteTab === "write" ? "bg-paper text-ink border border-border shadow-sm font-bold" : "text-ink-muted hover:text-ink"
                }`}
              >
                <PenLine className="h-3 w-3" />
                Edit
              </button>
            </div>
          </div>

          {/* Scrollable Notebook margins area */}
          <ScrollArea className="flex-1 relative bg-[#FDFBF7] dark:bg-[#1E222A]">
            
            {/* Horizontal Lined paper grid lines */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.15] dark:opacity-[0.07] bg-[linear-gradient(#1A3A5F_1px,transparent_1px)] bg-[size:100%_28px]" />
            
            {/* Left Hand Margin Line */}
            <div className="absolute top-0 bottom-0 left-[35px] w-[1px] bg-red-400/30 pointer-events-none" />

            {/* Notebook Margin Writing Pad */}
            <div className="pl-12 pr-6 py-6 space-y-6 relative select-text">
              
              {activeNoteTab === "read" ? (
                /* Read tab with markdown */
                <div className="space-y-6">
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-accent leading-none block">Summary</span>
                    <div className="text-ink">
                      <MarkdownRenderer content={selectedNote?.summary} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-accent leading-none block">Key Findings</span>
                    <div className="text-ink">
                      <MarkdownRenderer content={selectedNote?.keyFindings} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-accent leading-none block">Questions</span>
                    <div className="text-ink">
                      <MarkdownRenderer content={selectedNote?.openQuestions} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-accent leading-none block">Relevance</span>
                    <div className="text-ink">
                      <MarkdownRenderer content={selectedNote?.relevance} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-accent leading-none block">Extra Notes</span>
                    <div className="text-ink">
                      <MarkdownRenderer content={selectedNote?.freeform} />
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit tab form fields */
                <form onSubmit={handleSaveNotes} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="summary" className="font-mono text-[9px] uppercase text-accent-secondary font-bold">Summary</Label>
                    <Textarea 
                      id="summary" 
                      name="summary" 
                      defaultValue={selectedNote?.summary || ""} 
                      placeholder="Summarize the core premise, methodology, and conclusion (Markdown supported)..."
                      className="bg-paper/50 border-border focus:border-accent focus:ring-accent rounded-none min-h-[70px] p-2 text-xs font-sans placeholder:text-ink-muted/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="keyFindings" className="font-mono text-[9px] uppercase text-accent-secondary font-bold">Key Findings</Label>
                    <Textarea 
                      id="keyFindings" 
                      name="keyFindings" 
                      defaultValue={selectedNote?.keyFindings || ""} 
                      placeholder="What did the paper prove or identify? List main results..."
                      className="bg-paper/50 border-border focus:border-accent focus:ring-accent rounded-none min-h-[70px] p-2 text-xs font-sans placeholder:text-ink-muted/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="openQuestions" className="font-mono text-[9px] uppercase text-accent-secondary font-bold">Questions</Label>
                    <Textarea 
                      id="openQuestions" 
                      name="openQuestions" 
                      defaultValue={selectedNote?.openQuestions || ""} 
                      placeholder="What remains unclear? Criticisms, gaps, or logic issues..."
                      className="bg-paper/50 border-border focus:border-accent focus:ring-accent rounded-none min-h-[70px] p-2 text-xs font-sans placeholder:text-ink-muted/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="relevance" className="font-mono text-[9px] uppercase text-accent-secondary font-bold">Relevance</Label>
                    <Textarea 
                      id="relevance" 
                      name="relevance" 
                      defaultValue={selectedNote?.relevance || ""} 
                      placeholder="Why are we tracking this? How does it map to active project paths..."
                      className="bg-paper/50 border-border focus:border-accent focus:ring-accent rounded-none min-h-[70px] p-2 text-xs font-sans placeholder:text-ink-muted/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="freeform" className="font-mono text-[9px] uppercase text-accent-secondary font-bold">Extra Notes</Label>
                    <Textarea 
                      id="freeform" 
                      name="freeform" 
                      defaultValue={selectedNote?.freeform || ""} 
                      placeholder="Any extra raw logs, calculations, quotes, equations..."
                      className="bg-paper/50 border-border focus:border-accent focus:ring-accent rounded-none min-h-[100px] p-2 text-xs font-sans placeholder:text-ink-muted/30"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setActiveNoteTab("read")} 
                      className="font-mono text-[10px] uppercase text-ink-muted hover:text-ink rounded-none cursor-pointer"
                    >
                      Discard
                    </Button>
                    
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      className="bg-ink hover:bg-ink-muted text-paper transition-all rounded-none font-serif text-xs font-medium h-8 px-4 cursor-pointer"
                    >
                      {isPending ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </ScrollArea>
        </div>

      </div>
    </div>
  );
}
