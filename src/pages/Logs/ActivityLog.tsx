import React, { useState, useEffect } from "react";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Calendar, Filter, CheckCircle2, Clock, X, SkipForward } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";

// Define frequencies type
type Frequency = "morning" | "afternoon" | "evening" | "daily" | "weekly" | "monthly";

// Define status type
type StatusFilter = "all" | "completed" | "skipped" | "uncompleted";

interface LogItem {
  id: string;
  user_id: string;
  task_id: string;
  goal_id: string;
  action_title: string;
  goal_title: string;
  completed: boolean;
  skipped: boolean;
  timestamp: string;
  frequency: Frequency;
}

interface Task {
  id: string;
  title: string;
  frequency: Frequency;
  goal_id: string;
}

interface Goal {
  id: string;
  goal_text: string;
}

const ActivityLog = () => {
  const { user } = useAuth();
  const [logItems, setLogItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState<"all" | Frequency>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState("all"); // all, today, week, month

  useEffect(() => {
    if (user) {
      fetchLogItems();
    }
  }, [user]);

  const fetchLogItems = async () => {
    try {
      if (!user) return;

      // First fetch all logs
      const { data: logs, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (logsError) throw logsError;
      if (!logs || logs.length === 0) {
        setLogItems([]);
        setLoading(false);
        return;
      }

      // Get unique task IDs
      const taskIds = [...new Set(logs.map(log => log.task_id))];
      
      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, frequency, goal_id')
        .in('id', taskIds);
      
      if (tasksError) throw tasksError;
      
      // Create task map for easy lookup
      const taskMap = new Map<string, Task>();
      if (tasks) {
        tasks.forEach(task => {
          taskMap.set(task.id, task as Task);
        });
      }
      
      // Get unique goal IDs
      const goalIds = tasks 
        ? [...new Set(tasks.map(task => task.goal_id))]
        : [];
      
      // Fetch goals
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id, goal_text')
        .in('id', goalIds);
      
      if (goalsError) throw goalsError;
      
      // Create goal map for easy lookup
      const goalMap = new Map<string, Goal>();
      if (goals) {
        goals.forEach(goal => {
          goalMap.set(goal.id, goal as Goal);
        });
      }
      
      // Transform logs with task and goal info
      const transformedLogs: LogItem[] = logs.map(log => {
        const task = taskMap.get(log.task_id);
        const goal = task ? goalMap.get(task.goal_id) : undefined;
        
        return {
          id: log.id,
          user_id: log.user_id,
          task_id: log.task_id,
          goal_id: task?.goal_id || "",
          action_title: task?.title || "Unknown Action",
          goal_title: goal?.goal_text || "Unknown Goal",
          completed: log.completed,
          skipped: log.skipped || false,
          timestamp: log.timestamp,
          frequency: task?.frequency || "daily"
        };
      });
      
      setLogItems(transformedLogs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on search term, frequency, and date range
  const getFilteredItems = () => {
    return logItems.filter(item => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        item.action_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.goal_title.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Frequency filter
      const matchesFrequency = frequencyFilter === "all" || item.frequency === frequencyFilter;
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter === "completed") {
        matchesStatus = item.completed === true;
      } else if (statusFilter === "skipped") {
        matchesStatus = item.skipped === true;
      } else if (statusFilter === "uncompleted") {
        matchesStatus = !item.completed && !item.skipped;
      }
      
      // Date range filter
      let matchesDateRange = true;
      const itemDate = new Date(item.timestamp);
      const today = new Date();
      
      if (dateRange === "today") {
        const isToday = itemDate.getDate() === today.getDate() &&
                        itemDate.getMonth() === today.getMonth() &&
                        itemDate.getFullYear() === today.getFullYear();
        matchesDateRange = isToday;
      } else if (dateRange === "week") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(today.getDate() - 7);
        matchesDateRange = itemDate >= oneWeekAgo;
      } else if (dateRange === "month") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);
        matchesDateRange = itemDate >= oneMonthAgo;
      }
      
      return matchesSearch && matchesFrequency && matchesDateRange && matchesStatus;
    });
  };

  const filteredItems = getFilteredItems();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const hasActiveFilters = searchTerm || frequencyFilter !== "all" || dateRange !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setFrequencyFilter("all");
    setDateRange("all");
    setStatusFilter("all");
  };

  return (
    <Layout>
      <div className="w-full">
        <PageHeader 
          title="Activity Log" 
          description="Track your completed actions over time"
        />

        <div className="w-full flex flex-col gap-3 mb-6">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions or goals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-[150px]">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
                <SelectItem value="uncompleted">Uncompleted</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={dateRange}
              onValueChange={(value) => setDateRange(value)}
            >
              <SelectTrigger className="w-[150px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={frequencyFilter}
              onValueChange={(value) => setFrequencyFilter(value as typeof frequencyFilter)}
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="flex items-center gap-1">
                <X className="h-4 w-4" />
                <span>Clear Filters</span>
              </Button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            <p className="text-sm text-muted-foreground mr-2">Active filters:</p>
            {searchTerm && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Search className="h-3 w-3" />
                <span>{searchTerm}</span>
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSearchTerm("")} />
              </Badge>
            )}
            {frequencyFilter !== "all" && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Filter className="h-3 w-3" />
                <span>{frequencyFilter}</span>
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setFrequencyFilter("all")} />
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="outline" className="flex items-center gap-1">
                {statusFilter === "completed" && <CheckCircle2 className="h-3 w-3" />}
                {statusFilter === "skipped" && <SkipForward className="h-3 w-3" />}
                {statusFilter === "uncompleted" && <Clock className="h-3 w-3" />}
                <span>{statusFilter}</span>
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setStatusFilter("all")} />
              </Badge>
            )}
            {dateRange !== "all" && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{dateRange === "today" ? "Today" : dateRange === "week" ? "Past Week" : "Past Month"}</span>
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setDateRange("all")} />
              </Badge>
            )}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Activity History</CardTitle>
            <Badge variant="secondary">{filteredItems.length} {filteredItems.length === 1 ? 'entry' : 'entries'}</Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading activity logs...</div>
            ) : filteredItems.length > 0 ? (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <div className="border-t py-4" key={item.id}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          {item.action_title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">
                            {item.goal_title}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <time className="text-sm text-muted-foreground">
                          {formatDate(item.timestamp)}
                        </time>
                        <div className="mt-1 flex gap-2">
                          {item.completed && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 font-medium">
                              Completed
                            </span>
                          )}
                          {item.skipped && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100 font-medium">
                              Skipped
                            </span>
                          )}
                          {!item.completed && !item.skipped && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 font-medium">
                              Uncompleted
                            </span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {item.frequency}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 flex flex-col items-center gap-4">
                <p className="text-muted-foreground">
                  {hasActiveFilters ? 
                    "No matching log entries found. Try adjusting your filters." : 
                    "No activity logs yet. Start completing actions to see your history."}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="outline" onClick={fetchLogItems}>
                    Refresh
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ActivityLog; 