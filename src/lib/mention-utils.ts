/**
 * Utility functions for handling @mentions in chat
 */

import React from "react";

interface MentionMatch {
  username: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Detects @mentions in a message text
 * Returns array of mentioned usernames
 */
export const extractMentions = (text: string): string[] => {
  // Match @username pattern (alphanumeric, underscore, hyphen)
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const matches: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  // Return unique mentions
  return [...new Set(matches)];
};

/**
 * Detects all mention matches with their positions
 */
export const detectMentionMatches = (text: string): MentionMatch[] => {
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const matches: MentionMatch[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push({
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return matches;
};

/**
 * Renders message text with highlighted mentions
 */
export const renderMentionedText = (
  text: string,
  highlightColor = "text-blue-400"
): (string | React.ReactElement)[] => {
  const matches = detectMentionMatches(text);

  if (matches.length === 0) {
    return [text];
  }

  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;

  matches.forEach((match, idx) => {
    // Add text before mention
    if (match.startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, match.startIndex));
    }

    // Add highlighted mention
    parts.push(
      React.createElement(
        "span",
        {
          key: `mention-${idx}`,
          className: `font-semibold ${highlightColor}`,
        },
        `@${match.username}`
      )
    );

    lastIndex = match.endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};

/**
 * Detects if user is being mentioned at the current cursor position
 */
export const detectMentionAtCursor = (
  text: string,
  cursorPosition: number
): { isActive: boolean; query: string; startIndex: number } => {
  // Find the last @ before cursor
  const beforeCursor = text.substring(0, cursorPosition);
  const lastAtIndex = beforeCursor.lastIndexOf("@");

  if (lastAtIndex === -1) {
    return { isActive: false, query: "", startIndex: -1 };
  }

  // Check if there's a space between last @ and cursor
  const textBetween = beforeCursor.substring(lastAtIndex + 1);
  if (textBetween.includes(" ")) {
    return { isActive: false, query: "", startIndex: -1 };
  }

  // Extract the mention query
  const query = beforeCursor.substring(lastAtIndex + 1);

  // Only show autocomplete if @ is preceded by space or at start
  if (lastAtIndex > 0 && text[lastAtIndex - 1] !== " ") {
    return { isActive: false, query: "", startIndex: -1 };
  }

  return { isActive: true, query, startIndex: lastAtIndex };
};
