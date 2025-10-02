import { motion } from "motion/react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar, Download, Filter, CheckCircle, Clock, AlertCircle } from "lucide-react";

const exports = [
  {
    id: 1,
    name: "my-awesome-project",
    date: "2 часа назад",
    status: "completed",
    files: 156,
    size: "2.3 MB"
  },
  {
    id: 2,
    name: "client-dashboard",
    date: "Вчера, 14:30",
    status: "completed",
    files: 89,
    size: "1.8 MB"
  },
  {
    id: 3,
    name: "api-backend",
    date: "3 дня назад",
    status: "processing",
    files: 234,
    size: "4.1 MB"
  },
  {
    id: 4,
    name: "mobile-app",
    date: "5 дней назад",
    status: "failed",
    files: 0,
    size: "0 MB"
  }
];

const statusConfig = {
  completed: { icon: CheckCircle, label: "Завершён", color: "text-success bg-success/10" },
  processing: { icon: Clock, label: "Обработка", color: "text-warning bg-warning/10" },
  failed: { icon: AlertCircle, label: "Ошибка", color: "text-error bg-error/10" }
};

export function HistoryDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-8 bg-surface border-border rounded-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="mb-2">История экспортов</h3>
            <p className="text-muted text-sm">Все ваши экспорты в одном месте с удобными фильтрами</p>
          </div>
          <Button variant="outline" className="rounded-xl">
            <Filter className="h-4 w-4 mr-2" />
            Фильтры
          </Button>
        </div>

        <div className="space-y-4">
          {exports.map((exp, index) => {
            const StatusIcon = statusConfig[exp.status as keyof typeof statusConfig].icon;
            return (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01, x: 4 }}
                className="bg-bg border border-border rounded-xl p-6 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="mb-1">{exp.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {exp.date}
                      </span>
                      <span>{exp.files} файлов</span>
                      <span>{exp.size}</span>
                    </div>
                  </div>

                  <Badge className={`${statusConfig[exp.status as keyof typeof statusConfig].color} border-0`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig[exp.status as keyof typeof statusConfig].label}
                  </Badge>
                </div>

                {exp.status === 'completed' && (
                  <Button variant="ghost" size="icon" className="rounded-xl ml-4">
                    <Download className="h-5 w-5" />
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}
