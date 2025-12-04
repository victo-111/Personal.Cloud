import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Folder, FileText, Plus, Trash2, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserFile {
  id: string;
  name: string;
  content: string | null;
  file_type: string;
  parent_folder: string;
}

export const FileManager = () => {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState("root");
  const [selectedFile, setSelectedFile] = useState<UserFile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createType, setCreateType] = useState<"file" | "folder">("file");
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, [currentFolder]);

  const fetchFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("parent_folder", currentFolder)
      .order("file_type", { ascending: false })
      .order("name");

    if (data) setFiles(data);
  };

  const createItem = async () => {
    if (!newName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_files").insert({
      user_id: user.id,
      name: newName,
      content: createType === "file" ? "" : null,
      file_type: createType === "folder" ? "folder" : "text",
      parent_folder: currentFolder,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setNewName("");
    setIsCreating(false);
    fetchFiles();
    toast({ title: "Created", description: `${createType === "folder" ? "Folder" : "File"} created` });
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("user_files").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSelectedFile(null);
    fetchFiles();
    toast({ title: "Deleted", description: "Item deleted" });
  };

  const openItem = (file: UserFile) => {
    if (file.file_type === "folder") {
      setCurrentFolder(file.name);
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
    }
  };

  const goBack = () => {
    setCurrentFolder("root");
    setSelectedFile(null);
  };

  return (
    <div className="h-full flex bg-background">
      {/* Sidebar */}
      <div className="w-48 bg-card/50 border-r border-border p-3">
        <h3 className="font-semibold text-sm text-foreground mb-3">Quick Access</h3>
        <button
          onClick={() => { setCurrentFolder("root"); setSelectedFile(null); }}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-primary/10 ${
            currentFolder === "root" ? "bg-primary/20" : ""
          }`}
        >
          <Folder className="w-4 h-4 text-primary" />
          Home
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 bg-card border-b border-border">
          {currentFolder !== "root" && (
            <Button size="sm" variant="ghost" onClick={goBack}>
              ← Back
            </Button>
          )}
          <span className="text-sm text-muted-foreground">/{currentFolder === "root" ? "" : currentFolder}</span>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={() => { setIsCreating(true); setCreateType("folder"); }}>
            <Folder className="w-4 h-4 mr-1" /> New Folder
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setIsCreating(true); setCreateType("file"); }}>
            <Plus className="w-4 h-4 mr-1" /> New File
          </Button>
        </div>

        {/* Create dialog */}
        {isCreating && (
          <div className="p-2 bg-card/50 border-b border-border flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`New ${createType} name...`}
              className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary outline-none"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createItem()}
            />
            <Button size="sm" onClick={createItem}>Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Files grid */}
          <div className="flex-1 p-4 overflow-auto">
            <div className="grid grid-cols-4 gap-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  onDoubleClick={() => openItem(file)}
                  onClick={() => setSelectedFile(file)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedFile?.id === file.id ? "bg-primary/20" : "hover:bg-card"
                  }`}
                >
                  {file.file_type === "folder" ? (
                    <Folder className="w-12 h-12 text-primary" />
                  ) : (
                    <FileText className="w-12 h-12 text-accent" />
                  )}
                  <span className="text-sm text-center truncate w-full">{file.name}</span>
                </div>
              ))}
              {files.length === 0 && (
                <p className="col-span-4 text-center text-muted-foreground py-8">
                  This folder is empty
                </p>
              )}
            </div>
          </div>

          {/* File preview */}
          {selectedFile && selectedFile.file_type !== "folder" && (
            <div className="w-64 bg-card/50 border-l border-border p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm truncate">{selectedFile.name}</h3>
                <Button size="sm" variant="ghost" onClick={() => deleteItem(selectedFile.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Type: {selectedFile.file_type}</p>
                <p>Location: /{selectedFile.parent_folder}</p>
              </div>
              {selectedFile.content && (
                <div className="mt-4 p-2 bg-black/50 rounded text-xs font-mono text-primary max-h-40 overflow-auto">
                  {selectedFile.content.substring(0, 200)}
                  {selectedFile.content.length > 200 && "..."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
