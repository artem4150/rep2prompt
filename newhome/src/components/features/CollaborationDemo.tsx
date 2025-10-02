import { motion } from "motion/react";
import { Card } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Users, Share2, MessageSquare, Clock } from "lucide-react";

const team = [
  { name: "Анна Иванова", role: "Owner", avatar: "AI", online: true },
  { name: "Петр Сидоров", role: "Editor", avatar: "ПС", online: true },
  { name: "Мария Петрова", role: "Viewer", avatar: "МП", online: false }
];

const sharedExports = [
  {
    id: 1,
    name: "main-app-export",
    sharedBy: "Анна Иванова",
    workspace: "Team Alpha",
    date: "10 минут назад",
    comments: 3
  },
  {
    id: 2,
    name: "api-integration",
    sharedBy: "Петр Сидоров",
    workspace: "Team Alpha",
    date: "2 часа назад",
    comments: 7
  }
];

export function CollaborationDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-2 gap-6">
        {/* Team Members */}
        <Card className="p-8 bg-surface border-border rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="mb-2">Команда</h3>
              <p className="text-muted text-sm">Участники рабочего пространства</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl">
              <Users className="h-4 w-4 mr-2" />
              Пригласить
            </Button>
          </div>

          <div className="space-y-4">
            {team.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-bg rounded-xl border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-white">
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    {member.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-bg" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-muted">{member.role}</div>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-lg">
                  {member.role}
                </Badge>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Shared Exports */}
        <Card className="p-8 bg-surface border-border rounded-2xl">
          <div className="mb-6">
            <h3 className="mb-2">Общие экспорты</h3>
            <p className="text-muted text-sm">Экспорты, доступные вашей команде</p>
          </div>

          <div className="space-y-4">
            {sharedExports.map((exp, index) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-bg rounded-xl border border-border cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium">{exp.name}</h4>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg -mt-1">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2 text-sm text-muted">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {exp.sharedBy}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {exp.date}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                  <MessageSquare className="h-4 w-4 text-muted" />
                  <span className="text-sm text-muted">{exp.comments} комментариев</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
