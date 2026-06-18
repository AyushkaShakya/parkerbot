// lib/utils.js
// -----------------------------------------------------------------------------
// Small, framework-agnostic helper functions shared across components.
// -----------------------------------------------------------------------------

// Generate a short, reasonably-unique id (for messages and conversations).
export const uid = () => Math.random().toString(36).slice(2, 10);

// Format a timestamp like "2:05 PM" using the visitor's locale.
export const formatTime = (date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));

// Create a fresh, empty conversation object.
export const makeNewChat = () => ({
  id: uid(),
  title: "New chat",
  messages: [], // each: { id, role: "user"|"assistant", text, time }
});
