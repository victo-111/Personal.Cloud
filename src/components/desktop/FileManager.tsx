import { useState, useEffect, useCallback, DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Folder, FileText, Plus, Trash2, Edit2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserFile {
  id: string;
  name: string;
  content: string | null;
  file_type: string;
  parent_folder: string;
}

interface NavFolder {
  id: string;
  name: string;
}

export const FileManager = () => {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [navigationStack, setNavigationStack] = useState<NavFolder[]>([{ id: "root", name: "Home" }]);
  const [selectedFile, setSelectedFile] = useState<UserFile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createType, setCreateType] = useState<"file" | "folder">("file");
  const { toast } = useToast();
  const currentFolder = navigationStack[navigationStack.length - 1];

  const fetchFiles = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("parent_folder", currentFolder.id)
      .order("file_type", { ascending: false })
      .order("name");

    if (data) setFiles(data);
  }, [currentFolder.id]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const createItem = async () => {
    if (!newName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_files").insert({
      user_id: user.id,
      name: newName,
      content: createType === "file" ? "" : null,
      file_type: createType === "folder" ? "folder" : "text",
      parent_folder: currentFolder.id,
    });

    if (error) {
      toast({ title: "Error", description: "Error creating item. Please try again.", variant: "destructive" });
      return;
    }

    setNewName("");
    setIsCreating(false);
    fetchFiles();
    toast({ title: "Created", description: `${createType === "folder" ? "Folder" : "File"} created` });
  };

  const renameItem = async (id: string) => {
    const name = prompt('New name');
    if (!name) return;
    const { error } = await supabase.from('user_files').update({ name }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Rename failed', variant: 'destructive' });
      return;
    }
    fetchFiles();
    toast({ title: 'Renamed', description: 'Item renamed' });
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("user_files").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Error deleting item. Please try again.", variant: "destructive" });
      return;
    }
    setSelectedFile(null);
    fetchFiles();
    toast({ title: "Deleted", description: "Item deleted" });
  };

  const openItem = (file: UserFile) => {
    if (file.file_type === "folder") {
      setNavigationStack([...navigationStack, { id: file.id, name: file.name }]);
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
    }
  };

  const downloadItem = (file: UserFile) => {
    if (!file.content) return;
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const [editingContent, setEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState<string>("");

  const startEditing = () => {
    setEditedContent(selectedFile?.content || "");
    setEditingContent(true);
  };

  const saveContent = async () => {
    if (!selectedFile) return;
    const { error } = await supabase.from('user_files').update({ content: editedContent }).eq('id', selectedFile.id);
    if (error) {
      toast({ title: 'Error', description: 'Save failed', variant: 'destructive' });
      return;
    }
    setEditingContent(false);
    fetchFiles();
    // refresh selectedFile
    setSelectedFile((prev) => prev ? { ...prev, content: editedContent } : prev);
    toast({ title: 'Saved', description: 'File updated' });
  };

  const fileInputRef = useCallback((el: HTMLInputElement | null) => {
    if (!el) return;
    el.onchange = async (e: any) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const text = await f.text();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('user_files').insert({
        user_id: user.id,
        name: f.name,
        content: text,
        file_type: 'text',
        parent_folder: currentFolder.id,
      });
      if (error) {
        toast({ title: 'Error', description: 'Upload failed', variant: 'destructive' });
        return;
      }
      fetchFiles();
      toast({ title: 'Uploaded', description: f.name });
    };
  }, [currentFolder.id, fetchFiles, toast]);

  const goBack = () => {
    if (navigationStack.length > 1) {
      setNavigationStack(navigationStack.slice(0, -1));
      setSelectedFile(null);
    }
  };

  const [folderList, setFolderList] = useState<NavFolder[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_files')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('file_type', 'folder')
      .order('name');

    if (data) setFolderList(data as NavFolder[]);
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const moveItemToFolder = async (fileId: string, targetFolderId: string) => {
    const { error } = await supabase.from('user_files').update({ parent_folder: targetFolderId }).eq('id', fileId);
    if (error) {
      toast({ title: 'Error', description: 'Move failed', variant: 'destructive' });
      return;
    }
    fetchFiles();
    fetchFolders();
    toast({ title: 'Moved', description: 'Item moved' });
  };

  return (
    <div className="h-full flex bg-background">
      {/* Sidebar */}
      <div className="w-48 bg-card/50 border-r border-border p-3">
        <h3 className="font-semibold text-sm text-foreground mb-3">Quick Access</h3>
        <button
          onClick={() => { setNavigationStack([{ id: "root", name: "Home" }]); setSelectedFile(null); }}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-primary/10 ${
            currentFolder.id === "root" ? "bg-primary/20" : ""
          }`}
        >
          <Folder className="w-4 h-4 text-primary" />
          Home
        </button>

        <div className="mt-4">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Folders</h4>
          <div className="flex flex-col gap-1">
            {folderList.map((f) => (
              <button
                key={f.id}
                onClick={() => { setNavigationStack([...navigationStack, { id: f.id, name: f.name }]); setSelectedFile(null); }}
                onDragOgit commitgitver={(e: DragEvent<HTMLButtonElement>) => { e.preventDefault(); setDragOverFolderId(f.id); }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={async (e: DragEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  setDragOverFolderId(null);
                  const movedId = e.dataTransfer.getData('application/x-file-id');
                  if (movedId) {
                    await moveItemToFolder(movedId, f.id);
                    return;
                  }
                  // handle file uploads dropped from OS
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    const text = await file.text();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const { error } = await supabase.from('user_files').insert({
                      user_id: user.id,
                      name: file.name,
                      content: text,
                      file_type: 'text',
                      parent_folder: f.id,
                    });
                    if (error) {
                      toast({ title: 'Error', description: 'Upload failed', variant: 'destructive' });
                      return;
                    }
                    fetchFiles();
                    fetchFolders();
                    toast({ title: 'Uploaded', description: file.name });
                  }
                }}
                className={`w-full text-left px-2 py-1 rounded text-sm ${dragOverFolderId === f.id ? 'bg-primary/25' : 'hover:bg-primary/5'}`}>
                {f.name}
              </button>
            ))}
            {folderList.length === 0 && (
              <div className="text-xs text-muted-foreground">No folders</div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 bg-card border-b border-border">
          {navigationStack.length > 1 && (
            <Button size="sm" variant="ghost" onClick={goBack}>
              ← Back
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {navigationStack.map(folder => folder.name).join(' / ')}
          </span>
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
                  draggable
                  onDragStart={(ev: DragEvent<HTMLDivElement>) => { ev.dataTransfer.setData('application/x-file-id', file.id); }}
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
            <div className="w-80 bg-card/50 border-l border-border p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm truncate">{selectedFile.name}</h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => downloadItem(selectedFile)}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => renameItem(selectedFile.id)}>
                    Rename
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteItem(selectedFile.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Type: {selectedFile.file_type}</p>
                <p>Location: {navigationStack.map(f => f.name).join(' / ')}</p>
              </div>
              {!editingContent ? (
                <>
                  {selectedFile.content ? (
                    <div className="mt-4 p-2 bg-black/50 rounded text-xs font-mono text-primary max-h-56 overflow-auto">
                      {selectedFile.content}
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-muted-foreground">No content</div>
                  )}
                  <div className="mt-3">
                    <Button size="sm" onClick={startEditing}><Edit2 className="w-4 h-4 mr-1" /> Edit</Button>
                  </div>
                </>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="w-full h-56 p-2 bg-background border border-border rounded font-mono text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveContent}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingContent(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
