import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { themes } from "../api/client";

let currentStyleEl: HTMLLinkElement | null = null;

export function useTheme() {
  const { currentTheme, setTheme } = useStore();

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  async function applyTheme(name: string) {
    // Remove previous theme
    currentStyleEl?.remove();

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `/api/themes/builtin/${name}`;
    link.onerror = () => {
      // Try user theme
      link.href = `/api/themes/user/${name}`;
    };
    document.head.appendChild(link);
    currentStyleEl = link;

    document.documentElement.setAttribute("data-theme", name);
  }

  async function changeTheme(name: string) {
    setTheme(name);
    await themes.setCurrent(name).catch(() => {});
  }

  return { currentTheme, changeTheme };
}
