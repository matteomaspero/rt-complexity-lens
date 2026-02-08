import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { forwardRef, useEffect, useState } from "react";

export const ThemeToggle = forwardRef<HTMLButtonElement, object>(
  function ThemeToggle(_props, ref) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted) {
      return (
        <Button ref={ref} variant="ghost" size="icon" disabled>
          <Sun className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      );
    }

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }
);
