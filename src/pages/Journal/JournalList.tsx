import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { FileText, Plus, Search, Mic, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
}

const JournalList = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [user]);

  const fetchEntries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries(data as JournalEntry[]);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      toast.error("Failed to load your journal entries");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredEntries = entries.filter(entry => 
    entry.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      setSelectedEntries([]);
    }
  };

  const handleToggleSelection = (entryId: string) => {
    if (selectedEntries.includes(entryId)) {
      setSelectedEntries(selectedEntries.filter(id => id !== entryId));
    } else {
      setSelectedEntries([...selectedEntries, entryId]);
    }
  };

  const handleDeleteSingle = (entryId: string) => {
    setEntryToDelete(entryId);
    setShowDeleteDialog(true);
  };

  const handleDeleteSelected = () => {
    if (selectedEntries.length === 0) return;
    setEntryToDelete(null);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!user) return;

    try {
      const entriesToDelete = entryToDelete ? [entryToDelete] : selectedEntries;
      
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .in('id', entriesToDelete);

      if (error) throw error;

      toast.success(`Successfully deleted ${entriesToDelete.length} ${entriesToDelete.length === 1 ? 'entry' : 'entries'}`);
      setIsEditMode(false);
      setSelectedEntries([]);
      setShowDeleteDialog(false);
      fetchEntries();
    } catch (error) {
      console.error('Error deleting journal entries:', error);
      toast.error("Failed to delete journal entries");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Journal Entries</h1>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteSelected}
                  disabled={selectedEntries.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
                <Button variant="outline" onClick={handleToggleEditMode}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Link to="/journal/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Entry
                  </Button>
                </Link>
                <Button variant="outline" onClick={handleToggleEditMode}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <MenuToggleButton />
              </>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search journal entries..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {loading ? (
            <p>Loading your journal entries...</p>
          ) : filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <Card key={entry.id} className={`hover:shadow-md transition-shadow ${isEditMode && selectedEntries.includes(entry.id) ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    {isEditMode && (
                      <div className="mr-2">
                        <input
                          type="checkbox"
                          checked={selectedEntries.includes(entry.id)}
                          onChange={() => handleToggleSelection(entry.id)}
                          className="h-5 w-5"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      {isEditMode ? (
                        <h3 className="font-medium text-lg mb-2">
                          {entry.content?.substring(0, 50)}
                          {entry.content && entry.content.length > 50 ? "..." : ""}
                        </h3>
                      ) : (
                        <Link to={`/journal/${entry.id}`}>
                          <h3 className="font-medium text-lg mb-2 hover:underline">
                            {entry.content?.substring(0, 50)}
                            {entry.content && entry.content.length > 50 ? "..." : ""}
                          </h3>
                        </Link>
                      )}
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {entry.content?.substring(0, 200)}
                        {entry.content && entry.content.length > 200 ? "..." : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatDate(entry.created_at)}</div>
                      <div className="text-xs text-gray-500">{formatTime(entry.created_at)}</div>
                      {isEditMode ? (
                        <div className="flex gap-2 mt-2 justify-end">
                          <Link to={`/journal/edit/${entry.id}`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteSingle(entry.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <Link to={`/journal/${entry.id}`}>
                          <Button variant="ghost" size="sm" className="mt-2">
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No journal entries yet</h3>
              <p className="text-gray-500 mb-4">Start recording your thoughts and reflections</p>
              <Link to="/journal/new">
                <Button>
                  <Mic className="mr-2 h-4 w-4" />
                  Create Your First Entry
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {entryToDelete ? 'this entry' : `${selectedEntries.length} selected ${selectedEntries.length === 1 ? 'entry' : 'entries'}`}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default JournalList;
