// lib/user.js
"use client";

export const USERS = [
  { id: "ayushka", name: "Ayushka" },
  { id: "abc",     name: "abc" },
  { id: "gaurika",     name: "gaurika" },
  { id: "kanishka",   name: "kanishka" },
];

export function getUserId() {
  if (typeof window === "undefined") return USERS[0].id;
  return localStorage.getItem("parkerbot.userId") || USERS[0].id;
}

export function setUserId(id) {
  if (typeof window === "undefined") return;
  localStorage.setItem("parkerbot.userId", id);
}