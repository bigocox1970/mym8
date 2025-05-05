import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { 
  ListTodo, 
  Trash2, 
  Plus, 
  Loader2, 
  Bot, 
  Search, 
  Filter, 
  Clock, 
  Check, 
  X,
  Edit,
  Calendar,
  ArrowUpDown,
  MoreHorizontal
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { AIAssistantButton } from "@/components/AIAssistantButton";

interface TodoItem {
  id: string;
  user_id: string;
  content: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

type SortOption = "newest" | "oldest" | "alphabetical" | "completed";
type FilterOption = "all" | "active" | "completed";

const Todo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<TodoItem[]>([]);
  const [newTodoContent, setNewTodoContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<TodoItem | null>(null);
  const newTodoInputRef = useRef<HTMLInputElement>(null);

  // Fetch todos from Supabase
  const fetchTodos = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setTodos(data || []);
    } catch (error: unknown) {
      console.error("Error fetching todos:", error instanceof Error ? error.message : String(error));
      toast.error("Failed to load your todos");
    } finally {
      setLoading(false);
    }
  };

  // Apply filtering and sorting to todos
  useEffect(() => {
    if (!todos.length) {
      setFilteredTodos([]);
      return;
    }

    let result = [...todos];

    // Apply filter
    if (filterBy === "active") {
      result = result.filter(todo => !todo.completed);
    } else if (filterBy === "completed") {
      result = result.filter(todo => todo.completed);
    }

    // Apply search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(todo => 
        todo.content.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply sorting
    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "alphabetical") {
      result.sort((a, b) => a.content.localeCompare(b.content));
    } else if (sortBy === "completed") {
      result.sort((a, b) => {
        // Sort by completion status first (completed at bottom)
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        // Then by creation date (newest at top) for same completion status
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    setFilteredTodos(result);
  }, [todos, filterBy, sortBy, searchQuery]);

  // Add a new todo
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!newTodoContent.trim()) {
      toast.error("Todo content cannot be empty");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const newTodo = {
        user_id: user.id,
        content: newTodoContent.trim(),
        completed: false,
      };

      const { data, error } = await supabase
        .from("todos")
        .insert([newTodo])
        .select();

      if (error) {
        throw error;
      }

      setTodos([...(data as TodoItem[]), ...todos]);
      setNewTodoContent("");
      toast.success("Todo added successfully");
      
      // Focus the input field for quick addition of multiple todos
      if (newTodoInputRef.current) {
        newTodoInputRef.current.focus();
      }
    } catch (error: unknown) {
      console.error("Error adding todo:", error instanceof Error ? error.message : String(error));
      toast.error("Failed to add todo");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle todo completion status
  const toggleTodoStatus = async (todoId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("todos")
        .update({ 
          completed: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", todoId)
        .eq("user_id", user?.id);

      if (error) {
        throw error;
      }

      // Update local state
      setTodos(
        todos.map((todo) =>
          todo.id === todoId ? { ...todo, completed: !currentStatus, updated_at: new Date().toISOString() } : todo
        )
      );
      
      // Show toast for completed todos
      if (!currentStatus) {
        toast.success("Todo completed! 🎉");
      }
    } catch (error: unknown) {
      console.error("Error updating todo:", error instanceof Error ? error.message : String(error));
      toast.error("Failed to update todo");
    }
  };

  // Delete a todo
  const deleteTodo = async (todo: TodoItem) => {
    try {
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", todo.id)
        .eq("user_id", user?.id);

      if (error) {
        throw error;
      }

      // Update local state
      setTodos(todos.filter((t) => t.id !== todo.id));
      toast.success("Todo deleted successfully");
    } catch (error: unknown) {
      console.error("Error deleting todo:", error instanceof Error ? error.message : String(error));
      toast.error("Failed to delete todo");
    } finally {
      setTodoToDelete(null);
      setShowDeleteConfirm(false);
    }
  };
  
  // Edit todo content
  const editTodo = async () => {
    if (!editingTodo || !editContent.trim()) {
      toast.error("Todo content cannot be empty");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("todos")
        .update({ 
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", editingTodo.id)
        .eq("user_id", user?.id);

      if (error) {
        throw error;
      }

      // Update local state
      setTodos(
        todos.map((todo) =>
          todo.id === editingTodo.id ? 
            { ...todo, content: editContent.trim(), updated_at: new Date().toISOString() } : 
            todo
        )
      );
      
      toast.success("Todo updated successfully");
      setShowEditDialog(false);
      setEditingTodo(null);
      setEditContent("");
    } catch (error: unknown) {
      console.error("Error updating todo:", error instanceof Error ? error.message : String(error));
      toast.error("Failed to update todo");
    }
  };
  
  // Navigate to AI Assistant with a todo-related prompt
  const askAssistantAboutTodos = () => {
    // Store query in localStorage for the Assistant page to pick up
    localStorage.setItem('assistantQuestion', 
      "Can you help me organize and prioritize my todo list? I'd appreciate some tips on productivity and task management."
    );
    
    // Navigate to the assistant page
    navigate('/assistant');
  };
  
  // Get counts for the filter badges
  const activeTodosCount = todos.filter(todo => !todo.completed).length;
  const completedTodosCount = todos.filter(todo => todo.completed).length;

  // Clear completed todos
  const clearCompletedTodos = async () => {
    if (!user) return;
    
    const completedTodos = todos.filter(todo => todo.completed);
    if (completedTodos.length === 0) {
      toast.info("No completed todos to clear");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("user_id", user.id)
        .eq("completed", true);

      if (error) {
        throw error;
      }

      // Update local state
      setTodos(todos.filter(todo => !todo.completed));
      toast.success(`Cleared ${completedTodos.length} completed todos`);
    } catch (error: unknown) {
      console.error("Error clearing todos:", error instanceof Error ? error.message : String(error));
      toast.error("Failed to clear completed todos");
    }
  };

  // Load todos on component mount
  useEffect(() => {
    fetchTodos();
  }, [user]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Todo List</h1>
          <div className="flex items-center gap-2">
            <AIAssistantButton question="Can you help me organize my to-do list and prioritize tasks?" />
            <MenuToggleButton />
          </div>
        </div>

        <Card>
          <CardHeader className="bg-primary/5 border-b pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-primary" />
                  Manage Your Tasks
                </CardTitle>
                <CardDescription>
                  Keep track of your daily tasks and projects
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={filterBy === "all" ? "bg-muted" : ""}
                  onClick={() => setFilterBy("all")}
                >
                  All 
                  <Badge variant="outline" className="ml-2">{todos.length}</Badge>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={filterBy === "active" ? "bg-muted" : ""}
                  onClick={() => setFilterBy("active")}
                >
                  Active
                  <Badge variant="outline" className="ml-2">{activeTodosCount}</Badge>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={filterBy === "completed" ? "bg-muted" : ""}
                  onClick={() => setFilterBy("completed")}
                >
                  Completed
                  <Badge variant="outline" className="ml-2">{completedTodosCount}</Badge>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <form onSubmit={addTodo} className="flex gap-2">
                <Input
                  placeholder="Add a new todo..."
                  value={newTodoContent}
                  onChange={(e) => setNewTodoContent(e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1"
                  ref={newTodoInputRef}
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Add</span>
                </Button>
              </form>
              
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search todos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        <span>Sort</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                      <DropdownMenuItem 
                        onClick={() => setSortBy("newest")}
                        className={sortBy === "newest" ? "bg-muted" : ""}
                      >
                        <Clock className="h-4 w-4 mr-2" /> Newest First
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSortBy("oldest")}
                        className={sortBy === "oldest" ? "bg-muted" : ""}
                      >
                        <Calendar className="h-4 w-4 mr-2" /> Oldest First
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSortBy("alphabetical")}
                        className={sortBy === "alphabetical" ? "bg-muted" : ""}
                      >
                        <ArrowUpDown className="h-4 w-4 mr-2" /> Alphabetical
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSortBy("completed")}
                        className={sortBy === "completed" ? "bg-muted" : ""}
                      >
                        <Check className="h-4 w-4 mr-2" /> Completion Status
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={completedTodosCount === 0}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        <span>Clear Completed</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear completed todos?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all {completedTodosCount} completed todos.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={clearCompletedTodos}>
                          Clear {completedTodosCount} todos
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTodos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  {todos.length === 0 ? (
                    <>
                      <p>Your todo list is empty</p>
                      <p className="text-sm">Add a new todo to get started</p>
                    </>
                  ) : (
                    <>
                      <p>No matching todos found</p>
                      <p className="text-sm">Try changing your search or filters</p>
                    </>
                  )}
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredTodos.map((todo) => (
                    <li
                      key={todo.id}
                      className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/30 transition-colors"
                    >
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() => toggleTodoStatus(todo.id, todo.completed)}
                        className="h-5 w-5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`break-words ${
                            todo.completed ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {todo.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(todo.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTodo(todo);
                            setEditContent(todo.content);
                            setShowEditDialog(true);
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTodoToDelete(todo);
                            setShowDeleteConfirm(true);
                          }}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Edit Todo Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Todo</DialogTitle>
            <DialogDescription>
              Update the content of your todo item.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Todo content"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editTodo}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Todo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this todo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTodoToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => todoToDelete && deleteTodo(todoToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Todo; 