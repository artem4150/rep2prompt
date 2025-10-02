import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Crown, Check, Zap, Github, Webhook, FileText, Users, Sparkles } from "lucide-react";

const premiumFeatures = [
  { icon: Github, label: "Интеграция с GitHub/GitLab" },
  { icon: Webhook, label: "Автоматический экспорт по webhook" },
  { icon: FileText, label: "Генерация документации" },
  { icon: Users, label: "Неограниченные рабочие пространства" },
  { icon: Sparkles, label: "Приоритетная AI-обработка" },
  { icon: Zap, label: "Расширенная аналитика" }
];

export function PremiumSection() {
  return (
    <section className="py-12 px-[80px] bg-gradient-to-br from-primary/5 via-bg to-bg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-primary-700/10 to-transparent rounded-full blur-3xl" />
      
      <div className="max-w-[1200px] mx-auto relative">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="bg-gradient-to-r from-primary to-primary-700 text-white border-0 mb-6 px-4 py-2">
              <Crown className="h-4 w-4 mr-2" />
              Premium уровень
            </Badge>
            <h2 className="mb-4">
              Получите больше возможностей
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Зарегистрируйтесь сейчас и получите доступ к будущим премиум-функциям
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-8 mb-10">
          {premiumFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Check className="h-4 w-4 text-success" />
                  <span className="font-medium">{feature.label}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-12 bg-gradient-to-br from-surface to-surface/50 border-primary/20 rounded-3xl backdrop-blur-sm">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full mb-6">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-primary font-medium">Раннее предложение</span>
              </div>
              
              <h3 className="mb-4">
                Станьте Premium пользователем
              </h3>
              <p className="text-muted mb-8 text-lg">
                Зарегистрируйтесь сейчас и получите специальные условия доступа к Premium функциям, 
                когда они станут доступны
              </p>

              <div className="flex items-center justify-center gap-4">
                <Button className="bg-gradient-to-r from-primary to-primary-700 hover:from-primary-700 hover:to-primary text-white rounded-xl px-8 h-14 text-lg shadow-lg shadow-primary/20">
                  <Crown className="h-5 w-5 mr-2" />
                  Зарегистрироваться сейчас
                </Button>
                <Button variant="outline" className="rounded-xl px-8 h-14 text-lg">
                  Узнать больше
                </Button>
              </div>

              <p className="text-sm text-muted mt-6">
                Без кредитной карты • Бесплатно навсегда для базовых функций
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
