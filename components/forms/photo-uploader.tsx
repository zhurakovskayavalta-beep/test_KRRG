"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type PhotoUploaderProps = {
  files: File[];
  onChange: (files: File[]) => void;
  existing?: { id: string; storageKey: string; fileName: string }[];
  onRemoveExisting?: (id: string) => void;
  maxFiles?: number;
  className?: string;
};

export function PhotoUploader({
  files,
  onChange,
  existing = [],
  onRemoveExisting,
  maxFiles = 20,
  className,
}: PhotoUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = React.useState<string[]>([]);

  React.useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const totalCount = files.length + existing.length;
  const canAddMore = totalCount < maxFiles;

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const newFiles = Array.from(selected).filter((f) => f.type.startsWith("image/"));
    const room = maxFiles - totalCount;
    onChange([...files, ...newFiles.slice(0, room)]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {existing.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${photo.storageKey}`}
              alt={photo.fileName}
              className="h-full w-full object-cover"
            />
            {onRemoveExisting && (
              <button
                type="button"
                onClick={() => onRemoveExisting(photo.id)}
                className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                title="Удалить фото"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {previews.map((src, i) => (
          <div
            key={i}
            className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={files[i].name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(files.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              title="Убрать"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center rounded-md border border-dashed bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
          >
            <Upload className="h-5 w-5" />
            <span className="mt-1 text-xs">Добавить</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <p className="text-xs text-muted-foreground">
        Загружено: {totalCount} из {maxFiles}. Поддерживаются JPEG, PNG, WebP.
      </p>
    </div>
  );
}
