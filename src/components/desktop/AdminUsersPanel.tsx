import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Loader2, Mail, Calendar, Trophy, Shield } from "lucide-react";

interface UserProfile {
  user_id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  points: number | null;
  is_admin: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export const AdminUsersPanel = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"points" | "username" | "created">("points");

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order(sortBy === "points" ? "points" : sortBy === "username" ? "username" : "created_at", {
          ascending: sortBy !== "points",
        });

      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch users:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (
      (user.username?.toLowerCase().includes(search) || false) ||
      (user.email?.toLowerCase().includes(search) || false)
    );
  });

  const handleSort = (newSort: typeof sortBy) => {
    setSortBy(newSort);
    // Re-fetch with new sort
    setLoading(true);
    setTimeout(() => {
      fetchAllUsers();
    }, 300);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background to-card/50">
      {/* Header */}
      <div className="p-4 bg-card border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">CloudSpace Users</h2>
            <p className="text-xs text-muted-foreground">{filteredUsers.length} of {users.length} users</p>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by username or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Sort Buttons */}
      <div className="flex gap-2 p-3 bg-card/50 border-b border-border/50 flex-wrap">
        <button
          onClick={() => handleSort("points")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            sortBy === "points"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          🏆 Points
        </button>
        <button
          onClick={() => handleSort("username")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            sortBy === "username"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          👤 Username
        </button>
        <button
          onClick={() => handleSort("created")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            sortBy === "created"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          📅 Joined
        </button>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">Loading users...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-center">
              {searchTerm ? "No users found matching your search" : "No users yet"}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.user_id}
              className="p-3 bg-card border border-border rounded-lg hover:bg-card/80 transition-colors group"
            >
              {/* User Header */}
              <div className="flex items-start gap-3 mb-2">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {user.username?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {user.username || "Unnamed User"}
                    </h3>
                    {user.is_admin && (
                      <Shield className="w-4 h-4 text-yellow-500 flex-shrink-0" title="Admin" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>

                {/* Points Badge */}
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-2.5 py-1 rounded-lg flex-shrink-0">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="font-bold text-yellow-500 text-sm">
                    {user.points || 0}
                  </span>
                </div>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{user.email || "N/A"}</span>
                </div>
                {user.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(user.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Bar */}
              <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                    style={{ width: `${Math.min((user.points || 0) / 5, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.min((user.points || 0) / 5, 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      {!loading && (
        <div className="p-3 bg-card border-t border-border text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>👥 Total Users:</span>
            <span className="font-semibold text-foreground">{users.length}</span>
          </div>
          <div className="flex justify-between">
            <span>🛡️ Admins:</span>
            <span className="font-semibold text-yellow-500">
              {users.filter((u) => u.is_admin).length}
            </span>
          </div>
          <div className="flex justify-between">
            <span>🏆 Total Points:</span>
            <span className="font-semibold text-green-500">
              {users.reduce((sum, u) => sum + (u.points || 0), 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
