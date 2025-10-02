import { motion } from "motion/react";
import { CheckCircle, Sparkles } from "lucide-react";

const benefits = [
  {
    title: "История всех экспортов",
    description: "Все ваши экспорты сохраняются с фильтрами по дате и статусу"
  },
  {
    title: "Сохранённые профили",
    description: "Создавайте маски фильтров и используйте их повторно"
  },
  {
    title: "Командная работа",
    description: "Делитесь экспортами с командой в рабочих пространствах"
  },
  {
    title: "Аналитика проектов",
    description: "Диаграммы метрик, визуализация дерева проекта"
  },
  {
    title: "AI-ассистент",
    description: "Автоматическое резюме и анализ зависимостей"
  },
  {
    title: "Интеграции",
    description: "GitHub, GitLab, автоматический экспорт по webhook"
  }
];

export function BenefitsSection() {
  return (
    <section className="py-12 px-[80px] bg-surface">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Зачем регистрироваться?</span>
            </div>
            <h2 className="mb-4">
              Получите доступ к расширенным функциям
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Создайте аккаунт и откройте для себя мощные инструменты для работы с кодом
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-bg border border-border rounded-2xl p-6 cursor-pointer transition-shadow hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="mb-2">{benefit.title}</h3>
                  <p className="text-muted text-sm">{benefit.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
