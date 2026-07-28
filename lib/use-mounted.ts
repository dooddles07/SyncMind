"use client";

import { useEffect, useState } from "react";

/** False through the server render and the first client render, so hydration matches. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
