import { motion } from "motion/react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Sparkles, Shield, FileText, AlertTriangle, CheckCircle, Info } from "lucide-react";

const projectSummary = {
  title: "Анализ проекта: e-commerce-platform",
  description: "Полнофункциональная платформа электронной коммерции с React и Node.js",
  technologies: ["React", "TypeScript", "Node.js", "PostgreSQL", "Redis"],
  architecture: "Микросервисная архитектура с разделением на frontend и backend",
  complexity: "Средняя",
  maintainability: "Высокая"
};

const securityIssues = [
  {
    severity: "high",
    package: "axios",
    version: "0.21.0",
    issue: "Уязвимость SSRF",
    recommendation: "Обновить до версии 0.21.4 или выше"
  },
  {
    severity: "medium",
    package: "lodash",
    version: "4.17.19",
    issue: "Prototype pollution",
    recommendation: "Обновить до версии 4.17.21"
  },
  {
    severity: "low",
    package: "moment",
    version: "2.29.1",
    issue: "Устаревший пакет",
    recommendation: "Рассмотрите использование date-fns или day.js"
  }
];

const severityConfig = {
  high: { color: "text-error bg-error/10", icon: AlertTriangle },
  medium: { color: "text-warning bg-warning/10", icon: Info },
  low: { color: "text-muted bg-muted/10", icon: CheckCircle }
};

export function AIFeaturesDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-2 gap-6">
        {/* AI Project Summary */}
        <Card className="p-8 bg-surface border-border rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3>AI Резюме проекта</h3>
              <p className="text-sm text-muted">Автоматический анализ структуры</p>
            </div>
          </div>

          <div className="space-y-4 relative">
            <div>
              <h4 className="mb-2">{projectSummary.title}</h4>
              <p className="text-sm text-muted">{projectSummary.description}</p>
            </div>

            <div>
              <label className="block mb-2">Технологии</label>
              <div className="flex flex-wrap gap-2">
                {projectSummary.technologies.map((tech, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Badge className="bg-primary/10 text-primary border-0">
                      {tech}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <label className="block mb-1">Архитектура</label>
                <p className="text-sm">{projectSummary.architecture}</p>
              </div>
              <div>
                <label className="block mb-1">Сложность</label>
                <Badge className="bg-warning/10 text-warning border-0">
                  {projectSummary.complexity}
                </Badge>
              </div>
            </div>

            <Button className="w-full bg-primary hover:bg-primary-700 text-white rounded-xl">
              <FileText className="h-4 w-4 mr-2" />
              Генерировать документацию
            </Button>
          </div>
        </Card>

        {/* Security Analysis */}
        <Card className="p-8 bg-surface border-border rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-error/20 to-transparent rounded-full blur-3xl" />
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-error to-error/80 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3>Анализ безопасности</h3>
              <p className="text-sm text-muted">Проверка зависимостей</p>
            </div>
          </div>

          <div className="space-y-3 relative">
            {securityIssues.map((issue, index) => {
              const SeverityIcon = severityConfig[issue.severity as keyof typeof severityConfig].icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-bg rounded-xl border border-border"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-medium">{issue.package}</code>
                      <span className="text-xs text-muted font-mono">{issue.version}</span>
                    </div>
                    <Badge className={`${severityConfig[issue.severity as keyof typeof severityConfig].color} border-0`}>
                      <SeverityIcon className="h-3 w-3 mr-1" />
                      {issue.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted mb-2">{issue.issue}</p>
                  <p className="text-xs text-success">✓ {issue.recommendation}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-border relative">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted">Всего проблем:</span>
                <span className="ml-2 font-medium">{securityIssues.length}</span>
              </div>
              <Button variant="outline" className="rounded-xl">
                Подробный отчёт
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="mb-2">AI рекомендации</h4>
              <p className="text-sm text-muted">
                На основе анализа вашего проекта, мы рекомендуем оптимизировать структуру папок для лучшей масштабируемости 
                и рассмотреть внедрение ESLint правил для повышения качества кода.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
