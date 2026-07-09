"use client";

import React, { useState, useTransition } from "react";
import { updateProfile } from "./actions";
import { signOut } from "../login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, LogOut, Upload, User as UserIcon } from "lucide-react";

interface ProfileFormProps {
  user: {
    id: string;
    email: string;
    name: string;
    bio: string | null;
    focusArea: string | null;
    avatarUrl: string | null;
  };
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isSignOutPending, startSignOutTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image file size should be less than 2MB");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Profile updated successfully!");
      }
    });
  };

  const handleSignOut = () => {
    startSignOutTransition(async () => {
      await signOut();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar Selection */}
      <div className="space-y-2">
        <Label className="font-mono text-xs text-ink-muted uppercase">Profile Photo</Label>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-none border border-border bg-border/20 flex items-center justify-center overflow-hidden relative group">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserIcon className="h-8 w-8 text-ink-muted" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="avatarFile"
              className="px-3 py-1.5 bg-paper hover:bg-border/20 border border-border text-xs font-mono uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Image
            </Label>
            <input
              id="avatarFile"
              name="avatarFile"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={isPending}
            />
            <span className="text-[10px] font-mono text-ink-muted leading-none">Max file size: 2MB</span>
          </div>
        </div>
      </div>

      {/* Name Input */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="font-mono text-xs text-ink-muted uppercase">Your Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          defaultValue={user.name}
          required
          disabled={isPending}
          className="bg-paper border-border focus:border-accent focus:ring-accent rounded-none h-10 px-3 font-sans"
        />
      </div>

      {/* Focus Area */}
      <div className="space-y-1.5">
        <Label htmlFor="focusArea" className="font-mono text-xs text-ink-muted uppercase">Research Focus</Label>
        <Input
          id="focusArea"
          name="focusArea"
          type="text"
          defaultValue={user.focusArea || ""}
          placeholder="e.g. LLM Reasoning, Quantum Computing, Neuroscience"
          disabled={isPending}
          className="bg-paper border-border focus:border-accent focus:ring-accent rounded-none h-10 px-3 font-sans placeholder:text-ink-muted/40"
        />
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <Label htmlFor="bio" className="font-mono text-xs text-ink-muted uppercase">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={user.bio || ""}
          placeholder="Brief description of your research backgrounds, methodologies, and active directions..."
          disabled={isPending}
          className="bg-paper border-border focus:border-accent focus:ring-accent rounded-none min-h-[100px] p-3 font-sans placeholder:text-ink-muted/40 resize-y"
        />
      </div>

      {/* Hidden input to pass existing avatar url if not changed */}
      <input type="hidden" name="avatarUrl" defaultValue={user.avatarUrl || ""} />

      {/* Action Buttons */}
      <div className="pt-4 flex items-center justify-between border-t border-border gap-4">
        <Button
          type="button"
          onClick={handleSignOut}
          disabled={isSignOutPending || isPending}
          variant="outline"
          className="border-border bg-paper hover:bg-border/20 text-ink rounded-none h-10 px-4 font-mono text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
        >
          {isSignOutPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          Sign Out
        </Button>

        <Button
          type="submit"
          disabled={isPending || isSignOutPending}
          className="bg-ink hover:bg-ink-muted text-paper transition-all rounded-none font-serif text-sm font-medium h-10 px-6 cursor-pointer"
        >
          {isPending ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-paper" />
              Saving...
            </span>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
