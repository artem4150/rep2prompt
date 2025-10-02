import { motion } from "motion/react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Save, Star, FileCode, Filter, Plus } from "lucide-react";

const profiles = [
  {
    id: 1,
    name: "Frontend Only",
    description: "Только React компоненты и стили",
    filters: ["*.tsx", "*.css", "*.scss"],
    favorite: true,
    uses: 23
  },
  {
    id: 2,
    name: "API Documentation",
    description: "API роуты и документация",
    filters: ["*/api/*", "*.md", "swagger.json"],
    favorite: true,
    uses: 15
  },
  {
    id: 3,
    name: "Tests Only",
    description: "Все тестовые файлы",
    filters: ["*.test.ts", "*.spec.ts", "__tests__/*"],
    favorite: false,
    uses: 8
  },
  {
    id: 4,
    name: "Configuration",
    description: "Конфигурационные файлы",
    filters: ["*.config.js", "*.json", ".env.example"],
    favorite: false,
    uses: 12
  }
];

export function ProfilesDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-8 bg-surface border-border rounded-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="mb-2">Сохранённые профили экспорта</h3>
            <p className="text-muted text-sm">Создавайте маски фильтров и используйте их повторно</p>
          </div>
          <Button className="bg-primary hover:bg-primary-700 text-white rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            Создать профиль
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {profiles.map((profile, index) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-bg border border-border rounded-xl p-6 cursor-pointer relative overflow-hidden"
            >
              {profile.favorite && (
                <motion.div
                  initial={{ rotate: -15 }}
                  whileHover={{ rotate: 0, scale: 1.1 }}
                  className="absolute top-4 right-4"
                >
                  <Star className="h-5 w-5 text-warning fill-warning" />
                </motion.div>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileCode className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="mb-1">{profile.name}</h4>
                  <p className="text-sm text-muted">{profile.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {profile.filters.slice(0, 3).map((filter, i) => (
                  <Badge key={i} variant="outline" className="rounded-lg font-mono text-xs">
                    {filter}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-sm text-muted">Использован {profile.uses} раз</span>
                <Button variant="ghost" size="sm" className="rounded-lg">
                  Использовать
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
