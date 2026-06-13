"use client";

import * as React from "react";
import { Upload, X, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FileDropzoneProps = {
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeBytes?: number;
  label?: string;
  className?: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export function FileDropzone({
  value,
  onChange,
  accept,
  maxSizeBytes,
  label = "Перетащите файл или нажмите для выбора",
  className,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (maxSizeBytes && file.size > maxSizeBytes) {
      setError(`Файл слишком большой (макс. ${formatSize(maxSizeBytes)})`);
      return;
    }
    setError(null);
    onChange(file);
  };

  if (value) {
    return (
      <div className={cn("flex items-center gap-2 rounded-md border bg-muted/40 p-3", className)}>
        <FileIcon className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1 truncate">
          <div className="truncate text-sm font-medium">{value.name}</div>
          <div className="text-xs text-muted-foreground">{formatSize(value.size)}</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          title="Убрать файл"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-6 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-input hover:bg-muted/40",
          className,
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm">{label}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </>
  );
}
