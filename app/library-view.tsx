"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPaper, createPaperUploadUrl, deletePaper } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Plus, FileUp, User, Users,
  ChevronRight, Library, Moon, Sun, Loader2, Trash2
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { PaperStatus } from "@prisma/client";

interface PaperWithNotes {
  id: string;
  title: string;
  authors: string;
  year: number | null;
  sourceUrl: string | null;
  fileUrl: string | null;
  status: PaperStatus;
  createdAt: Date;
  addedBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface WorkspaceMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

interface WorkspaceInvite {
  id: string;
  email: string;
  token: string;
  acceptedAt: Date | null;
}

interface ActivityItem {
  id: string;
  type: string;
  createdAt: Date;
  metadata?: { [key: string]: any } | null;
  user: { id: string; name: string };
  paper?: { id: string; title: string } | null;
}

interface WorkspaceItem {
  id: string;
  name: string;
  description: string | null;
}

interface LibraryViewProps {
  initialPapers: PaperWithNotes[];
  workspaceId: string;
  workspaceName: string;
  workspaceDescription?: string | null;
  currentUserId: string;
  members?: WorkspaceMember[];
  invites?: WorkspaceInvite[];
  activities?: ActivityItem[];
  workspaces?: WorkspaceItem[];
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export default function LibraryView({
  initialPapers,
  workspaceId,
  workspaceName,
  workspaceDescription,
  currentUserId,
  members = [],
  invites = [],
  workspaces = [],
  user,
}: LibraryViewProps) {
  const [papers] = useState<PaperWithNotes[]>(initialPapers);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  
  const [isPending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabaseClient = createClient();

  const handleDeletePaperClick = async (e: React.MouseEvent, paperId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this paper? This will also remove its notes, comments, and tags.")) {
      return;
    }

    startTransition(async () => {
      const res = await deletePaper(paperId);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Paper deleted.");
        router.refresh();
      }
    });
  };

  // Filtered papers
  const filteredPapers = papers.filter(p => {
    if (filterStatus === "ALL") return true;
    return p.status === filterStatus;
  });

  const handleAddPaper = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("workspaceId", workspaceId);

    const pdfFile = formData.get("pdfFile") as File | null;
    const sourceUrl = formData.get("sourceUrl") as string;

    if (!sourceUrl && (!pdfFile || pdfFile.size === 0)) {
      toast.error("Please provide either a source URL link or upload a PDF file.");
      return;
    }

    const maxFileSize = 20 * 1024 * 1024;
    if (pdfFile && pdfFile.size > maxFileSize) {
      toast.error("Please upload a PDF smaller than 20 MB.");
      return;
    }

    startTransition(async () => {
      try {
        let resolvedFileUrl: string | null = null;
        let resolvedFileName: string | null = null;

        if (pdfFile && pdfFile.size > 0) {
          const uploadUrlRes = await createPaperUploadUrl(pdfFile.name);
          if (!uploadUrlRes || "error" in uploadUrlRes || !uploadUrlRes.path || !uploadUrlRes.token) {
            toast.error(uploadUrlRes?.error || "Failed to prepare PDF upload.");
            return;
          }

          const { path, token } = uploadUrlRes;
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from("papers")
            .uploadToSignedUrl(path, token, pdfFile, {
              contentType: pdfFile.type || "application/pdf",
            });

          if (uploadError || !uploadData) {
            toast.error(uploadError?.message || "PDF upload failed.");
            return;
          }

          const { data: publicUrlData } = supabaseClient.storage
            .from("papers")
            .getPublicUrl(path);

          resolvedFileUrl = publicUrlData.publicUrl;
          resolvedFileName = pdfFile.name;
        }

        if (resolvedFileUrl) {
          formData.append("fileUrl", resolvedFileUrl);
          formData.append("fileName", resolvedFileName || pdfFile?.name || "");
        }

        if (pdfFile) {
          formData.delete("pdfFile");
        }

        const res = await addPaper(formData);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("Paper added successfully!");
          setIsAddDialogOpen(false);
          setPdfFileName("");
          if (res.paperId) {
            router.push(`/paper/${res.paperId}`);
          } else {
            window.location.reload();
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unexpected upload error.");
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFileName(file.name);
    } else {
      setPdfFileName("");
    }
  };


  const getStatusColor = (status: PaperStatus) => {
    switch (status) {
      case "TO_READ": return "bg-border text-ink-muted border-border/80";
      case "READING": return "bg-accent/15 text-accent border-accent/30 font-semibold";
      case "DONE": return "bg-accent-forest/15 text-accent-forest border-accent-forest/30 font-semibold";
      case "REFERENCE": return "font-mono text-ink-muted/80 bg-border/40 border-border/60";
    }
  };

  const owner = members.find(m => m.role === "OWNER");
  const isOwnWorkspace = owner?.id === currentUserId;
  const ownerName = isOwnWorkspace ? "you" : owner?.name || "unknown";
  const currentUserMember = members.find(m => m.id === currentUserId);
  const isWorkspaceOwner = currentUserMember?.role === "OWNER" || isOwnWorkspace;

  return (
    <div className="min-h-screen w-full bg-paper text-ink selection:bg-accent/35 flex flex-col font-sans">
      
      {/* Premium Notebook Header */}
      <header className="border-b border-border py-3 px-6 md:px-8 bg-paper flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Home / Logo — links to dashboard */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
            title="Go to home"
          >
            <div className="h-8 w-8 bg-accent-forest text-paper flex items-center justify-center rounded-none font-mono font-bold text-base group-hover:bg-accent-forest/80 transition-colors">
              E!
            </div>
            <span className="font-serif text-xl font-bold tracking-tight group-hover:text-accent-forest transition-colors">Eureka!</span>
          </Link>
          <span className="text-border">|</span>
          <div className="flex flex-col gap-0.5">
            <Select 
              value={workspaceId} 
              onValueChange={(val) => router.push(`/dashboard/${val}`)}
            >
              <SelectTrigger className="font-mono text-xs uppercase border border-border/60 bg-paper/50 rounded-none h-7 px-2 cursor-pointer max-w-[200px]">
                <span className="truncate">{workspaceName}</span>
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[9px] text-ink-muted leading-none">
              Owned by {ownerName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Team page link */}
          <Link
            href={`/teams/${workspaceId}`}
            className="inline-flex items-center gap-1.5 border border-border hover:bg-border/20 text-ink rounded-none text-xs h-8 px-3 font-serif transition-all cursor-pointer"
          >
            <Users className="h-3.5 w-3.5 text-ink-muted" />
            Team
          </Link>

          {/* Light/Dark Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-ink-muted hover:text-ink cursor-pointer hover:bg-border/20 rounded-none h-8 w-8"
          >
            {!mounted ? (
              <div className="h-4 w-4" />
            ) : theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* My Work / Profile button */}
          <Link
            href="/profile/me"
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

      {/* Main Workspace Library (Full width list view) */}
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 md:px-8 py-6">
        {workspaceDescription && (
          <p className="text-sm text-ink-muted leading-relaxed mb-4">{workspaceDescription}</p>
        )}
        
        {/* Filtering & Action Bar */}
        <div className="py-4 border-b border-border bg-paper/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[10px] text-ink-muted uppercase mr-1.5">Filters</span>
            {["ALL", "TO_READ", "READING", "DONE", "REFERENCE"].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-all border ${
                  filterStatus === status 
                    ? "bg-ink text-paper border-ink" 
                    : "bg-paper hover:bg-border/20 text-ink-muted border-border/40"
                } rounded-none cursor-pointer`}
              >
                {status === "ALL" ? "All" : status.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Add Paper Trigger (Simplified Modal) */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger
              render={
                <Button className="bg-accent-forest hover:bg-accent-forest/90 text-paper transition-all rounded-none font-serif text-sm px-4 h-9 gap-1.5 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  Add Document
                </Button>
              }
            />
            
            <DialogContent className="bg-paper border border-border rounded-none max-w-md p-6 font-sans">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl font-bold tracking-tight text-ink">Add a Paper</DialogTitle>
                <DialogDescription className="font-mono text-xs text-ink-muted uppercase tracking-wider mt-1">
                  Upload a PDF or paste a link (arXiv, DOI, or any URL)
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddPaper} className="space-y-5 py-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sourceUrl" className="font-mono text-[10px] text-ink-muted uppercase">Paper Link (arXiv / DOI / any URL)</Label>
                  <Input 
                    id="sourceUrl" 
                    name="sourceUrl" 
                    type="text" 
                    placeholder="https://arxiv.org/abs/1706.03762" 
                    disabled={isPending}
                    className="bg-paper border-border rounded-none h-10 placeholder:text-ink-muted/30 focus:border-accent focus:ring-accent" 
                  />
                </div>

                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-paper px-3 text-ink-muted font-mono text-[9px] tracking-widest">or</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] text-ink-muted uppercase">Upload PDF Document</Label>
                  <div className="relative border border-dashed border-border h-16 bg-paper hover:bg-border/20 transition-all flex flex-col items-center justify-center font-mono text-[10px] uppercase cursor-pointer">
                    <FileUp className="h-5 w-5 text-ink-muted mb-1" />
                    {pdfFileName ? (
                      <span className="text-accent font-semibold px-4 truncate max-w-full">{pdfFileName}</span>
                    ) : (
                      <span>Select PDF File</span>
                    )}
                    <input 
                      id="pdfFile" 
                      name="pdfFile" 
                      type="file" 
                      accept="application/pdf" 
                      disabled={isPending}
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                  </div>
                </div>

                <DialogFooter className="pt-4 border-t border-border flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-border rounded-none font-mono text-xs uppercase cursor-pointer">Cancel</Button>
                  <Button type="submit" disabled={isPending} className="bg-ink hover:bg-ink-muted text-paper rounded-none font-serif text-sm px-6 cursor-pointer">
                    {isPending ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Add Paper"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Papers List */}
        <ScrollArea className="flex-1 bg-paper mt-2">
          {filteredPapers.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center px-4">
              <Library className="h-12 w-12 text-ink-muted/30 mb-3" />
              <h3 className="font-serif text-lg font-bold text-ink-muted">{filterStatus === "ALL" ? "No papers yet" : "Nothing here"}</h3>
              <p className="font-mono text-xs text-ink-muted/70 mt-1 max-w-xs leading-relaxed">{filterStatus === "ALL" ? "Add your first paper using the button above." : "No papers match this filter."}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredPapers.map(paper => (
                <Link
                  key={paper.id}
                  href={`/paper/${paper.id}`}
                  className="py-5 px-3 transition-all cursor-pointer flex items-center justify-between gap-4 border-l-2 border-transparent hover:border-accent-forest hover:bg-border/10 group block"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 border text-[9px] font-mono uppercase tracking-wider rounded-none ${getStatusColor(paper.status)}`}>
                        {paper.status.replace("_", " ")}
                      </span>
                      {paper.year && (
                        <span className="font-mono text-[10px] text-ink-muted">{paper.year}</span>
                      )}
                      <span className="flex items-center gap-1.5 ml-1">
                        <div className="h-4 w-4 border border-border bg-accent-forest/10 flex items-center justify-center overflow-hidden shrink-0">
                          {paper.addedBy.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={paper.addedBy.avatarUrl} alt={paper.addedBy.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-mono text-[8px] font-bold text-accent-forest uppercase">
                              {paper.addedBy.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[9px] text-ink-muted">
                          {paper.addedBy.id === currentUserId ? "Added by you" : `Added by ${paper.addedBy.name}`}
                        </span>
                      </span>
                    </div>

                    <h3 className="font-serif text-base font-bold text-ink leading-snug group-hover:text-accent-secondary truncate">
                       {paper.title}
                    </h3>

                    <p className="font-sans text-xs text-ink-muted truncate">
                      {paper.authors}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(paper.addedBy.id === currentUserId || isWorkspaceOwner) && (
                      <button
                        onClick={(e) => handleDeletePaperClick(e, paper.id)}
                        disabled={isPending}
                        className="p-1 hover:bg-destructive/10 text-ink-muted hover:text-destructive transition-all rounded-none cursor-pointer relative z-10"
                        title="Delete paper"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 text-ink-muted/40 transition-transform group-hover:translate-x-1 group-hover:text-accent-forest" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
