import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { motion } from "motion/react";
import { Upload, Github, GitBranch, FileCode, Sparkles, Zap, Shield } from "lucide-react";
import { useState } from "react";

export function HeroSection() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  return (
    <section className="relative pt-32 pb-16 px-[80px] overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-primary/20 via-primary-700/10 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-primary-700/20 via-primary/10 to-transparent rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="text-center mb-12">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full mb-8"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Новое: AI-анализ кода в реальном времени</span>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="mb-6 text-5xl leading-tight">
              Экспортируйте ваш код <br />
              <span className="bg-gradient-to-r from-primary via-primary-700 to-primary bg-clip-text text-transparent inline-block">
                быстро и просто
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted text-lg max-w-2xl mx-auto mb-12"
          >
            Профессиональный инструмент для экспорта, анализа и документирования вашего кода с поддержкой AI
          </motion.p>

          {/* Quick Export Field */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-surface rounded-2xl p-6 shadow-xl border border-border relative overflow-hidden">
              {/* Card Shine Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              />
              
              <div className="relative">
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 relative">
                    <Github className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                    <Input
                      placeholder="https://github.com/username/repository"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className="pl-12 h-14 rounded-xl border-border bg-bg"
                    />
                  </div>
                  <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="h-14 px-8 rounded-xl bg-gradient-to-r from-primary to-primary-700 hover:from-primary-700 hover:to-primary text-white shadow-lg shadow-primary/20"
                  >
                    {isExporting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Upload className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mr-2" />
                        Экспортировать
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-6 text-sm text-muted">
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    GitHub
                  </div>
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    GitLab
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    Local Files
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-3 gap-4 mt-12 max-w-3xl mx-auto">
            {[
              { icon: Sparkles, label: "AI-анализ кода", color: "from-primary/20 to-primary/5", delay: 0.5 },
              { icon: Zap, label: "Мгновенный экспорт", color: "from-warning/20 to-warning/5", delay: 0.6 },
              { icon: Shield, label: "Безопасность данных", color: "from-success/20 to-success/5", delay: 0.7 }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: item.delay }}
                whileHover={{ y: -8, scale: 1.05 }}
                className={`bg-gradient-to-br ${item.color} border border-border/50 rounded-xl p-5 cursor-pointer backdrop-blur-sm`}
              >
                <item.icon className="h-6 w-6 text-primary mb-2 mx-auto" />
                <p className="text-sm font-medium">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}