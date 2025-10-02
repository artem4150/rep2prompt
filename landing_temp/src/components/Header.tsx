import { Button } from "./ui/button";
import { motion } from "motion/react";
import { LogIn, Moon, Sun } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  onAuthClick: () => void;
}

export function Header({ onAuthClick }: HeaderProps) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-border/50 shadow-sm"
    >
      <div className="max-w-[1200px] mx-auto px-[80px] h-20 flex items-center justify-between">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center">
            <span className="font-semibold text-white">EX</span>
          </div>
          <span className="font-semibold text-xl">ExportHub</span>
        </motion.div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={onAuthClick}
              className="bg-gradient-to-r from-primary to-primary-700 hover:from-primary-700 hover:to-primary text-white rounded-xl px-6 relative overflow-hidden group shadow-lg shadow-primary/20"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              <span className="relative z-10 flex items-center">
                <LogIn className="h-4 w-4 mr-2" />
                Войти / Регистрация
              </span>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
