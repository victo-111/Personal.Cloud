import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface MentionAutocompleteProps {
  isActive: boolean;
  query: string;
  position: { top: number; left: number };
  onSelectMention: (username: string) => void;
  currentUserId?: string;
}

interface UserSuggestion {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export const MentionAutocomplete = ({
  isActive,
  query,
  position,
  onSelectMention,
  currentUserId,
}: MentionAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isActive || query.length === 0) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .ilike("username", `%${query}%`)
        .limit(5);

      if (data && !error) {
        // Filter out current user
        const filtered: UserSuggestion[] = data
          .filter((p) => p.user_id !== currentUserId)
          .map((p) => ({
            id: p.user_id,
            username: p.username,
            avatar_url: p.avatar_url,
          }));
        setSuggestions(filtered);
        setSelectedIndex(0);
      }
    };

    fetchSuggestions();
  }, [query, isActive, currentUserId]);

  if (!isActive || suggestions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: "200px",
      }}
    >
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion.id}
          onMouseEnter={() => setSelectedIndex(index)}
          onClick={() => onSelectMention(suggestion.username || "")}
          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
            index === selectedIndex
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-foreground"
          }`}
        >
          {suggestion.avatar_url && (
            <img
              src={suggestion.avatar_url}
              alt={suggestion.username || "user"}
              className="w-6 h-6 rounded-full"
            />
          )}
          <div className="flex-1">
            <span className="font-medium">@{suggestion.username}</span>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
};
