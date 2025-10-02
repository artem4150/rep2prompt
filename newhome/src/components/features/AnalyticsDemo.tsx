import { motion } from "motion/react";
import { Card } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileCode, Package, GitBranch, Activity } from "lucide-react";

const codeMetrics = [
  { name: "TypeScript", lines: 12500, color: "#6366F1" },
  { name: "JavaScript", lines: 8300, color: "#F59E0B" },
  { name: "CSS", lines: 4200, color: "#10B981" },
  { name: "HTML", lines: 2100, color: "#EF4444" }
];

const dependencyData = [
  { name: "React", version: "18.2.0", type: "prod" },
  { name: "TypeScript", version: "5.0.0", type: "dev" },
  { name: "Tailwind", version: "3.3.0", type: "prod" },
  { name: "Vite", version: "4.3.0", type: "dev" }
];

const stats = [
  { icon: FileCode, label: "Всего файлов", value: "234", color: "text-primary" },
  { icon: Package, label: "Зависимости", value: "67", color: "text-success" },
  { icon: GitBranch, label: "Веток", value: "12", color: "text-warning" },
  { icon: Activity, label: "Commits", value: "1,245", color: "text-error" }
];

export function AnalyticsDemo() {
  const totalLines = codeMetrics.reduce((sum, item) => sum + item.lines, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <Card className="p-6 bg-surface border-border rounded-2xl">
                <stat.icon className={`h-8 w-8 ${stat.color} mb-4`} />
                <div className="text-3xl font-semibold mb-1">{stat.value}</div>
                <div className="text-sm text-muted">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Code Distribution */}
          <Card className="p-8 bg-surface border-border rounded-2xl">
            <h3 className="mb-6">Распределение кода</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={codeMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px'
                  }}
                />
                <Bar dataKey="lines" radius={[8, 8, 0, 0]}>
                  {codeMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Language Distribution Pie */}
          <Card className="p-8 bg-surface border-border rounded-2xl">
            <h3 className="mb-6">Языки проекта</h3>
            <div className="flex items-center justify-between">
              <ResponsiveContainer width="60%" height={250}>
                <PieChart>
                  <Pie
                    data={codeMetrics}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="lines"
                  >
                    {codeMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-3">
                {codeMetrics.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted">
                        {((item.lines / totalLines) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Dependencies */}
        <Card className="p-8 bg-surface border-border rounded-2xl">
          <h3 className="mb-6">Основные зависимости</h3>
          <div className="grid grid-cols-4 gap-4">
            {dependencyData.map((dep, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-bg rounded-xl border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{dep.name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    dep.type === 'prod' ? 'bg-primary/10 text-primary' : 'bg-muted/20 text-muted'
                  }`}>
                    {dep.type}
                  </span>
                </div>
                <div className="text-sm text-muted font-mono">{dep.version}</div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
