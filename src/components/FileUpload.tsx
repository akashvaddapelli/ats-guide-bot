import { useCallback, useState } from "react";
import { Upload, FileText, X } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  file: File | null;
  onClear: () => void;
}

const FileUpload = ({ onFileSelect, file, onClear }: FileUploadProps) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped && isValid(dropped)) onFileSelect(dropped);
    },
    [onFileSelect]
  );

  const isValid = (f: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    return validTypes.includes(f.type) && f.size <= 5 * 1024 * 1024;
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${
        dragOver
          ? "border-primary bg-accent"
          : file
          ? "border-primary/30 bg-accent/50"
          : "border-border hover:border-primary/40 hover:bg-accent/30"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {file ? (
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <p className="font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button onClick={onClear} className="ml-4 rounded-full p-1 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">
            Drag & drop your resume here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">PDF or DOCX, max 5MB</p>
          <label className="mt-4 cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/80">
            Browse Files
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && isValid(f)) onFileSelect(f);
              }}
            />
          </label>
        </>
      )}
    </div>
  );
};

export default FileUpload;
