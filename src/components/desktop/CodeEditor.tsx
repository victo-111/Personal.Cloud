import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Save, FileCode, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeFile {
  id: string;
  name: string;
  content: string;
}

export const CodeEditor = () => {
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFile, setActiveFile] = useState<CodeFile | null>(null);
  const [code, setCode] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("file_type", "code")
      .order("created_at", { ascending: false });

    if (data) {
      setFiles(data.map(f => ({ id: f.id, name: f.name, content: f.content || "" })));
      if (data.length > 0 && !activeFile) {
        setActiveFile({ id: data[0].id, name: data[0].name, content: data[0].content || "" });
        setCode(data[0].content || "");
      }
    }
  };

  const createFile = async () => {
    if (!newFileName.trim()) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_files")
      .insert({
        user_id: user.id,
        name: newFileName,
        content: "// Start coding here\n",
        file_type: "code",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (data) {
      const newFile = { id: data.id, name: data.name, content: data.content || "" };
      setFiles([newFile, ...files]);
      setActiveFile(newFile);
      setCode(newFile.content);
      setNewFileName("");
      toast({ title: "File created", description: `${newFileName} created successfully` });
    }
  };

  const saveFile = async () => {
    if (!activeFile) return;

    const { error } = await supabase
      .from("user_files")
      .update({ content: code })
      .eq("id", activeFile.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setFiles(files.map(f => f.id === activeFile.id ? { ...f, content: code } : f));
    toast({ title: "Saved", description: "File saved successfully" });
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langs: Record<string, string> = {
      js: "javascript", ts: "typescript", py: "python", html: "html", css: "css", json: "json"
    };
    return langs[ext || ""] || "plaintext";
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-card border-b border-border">
        <input
          type="text"
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          placeholder="filename.js"
          className="px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary outline-none"
          onKeyDown={(e) => e.key === "Enter" && createFile()}
        />
        <Button size="sm" variant="ghost" onClick={createFile}>
          <Plus className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={saveFile} disabled={!activeFile}>
          <Save className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File list */}
        <div className="w-48 bg-card/50 border-r border-border overflow-auto">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => { setActiveFile(file); setCode(file.content); }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-primary/10 transition-colors ${
                activeFile?.id === file.id ? "bg-primary/20 border-l-2 border-primary" : ""
              }`}
            >
              <FileCode className="w-4 h-4 text-primary" />
              <span className="truncate">{file.name}</span>
            </button>
          ))}
          {files.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No files yet</p>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {activeFile && (
            <div className="px-3 py-1 bg-card/30 border-b border-border text-xs text-muted-foreground">
              {activeFile.name} • {getLanguage(activeFile.name)}
            </div>
          )}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full p-4 bg-black/90 text-primary font-mono text-sm resize-none outline-none"
            placeholder={activeFile ? "" : "Create a new file to start coding..."}
            disabled={!activeFile}
            spellCheck={false}
            style={{ tabSize: 2 }}
          />
        </div>
      </div>
    </div>
  );
};
