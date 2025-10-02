import { motion } from "motion/react";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export function Footer() {
  const links = {
    product: [
      { label: "Возможности", href: "#" },
      { label: "Цены", href: "#" },
      { label: "Документация", href: "#" },
      { label: "API", href: "#" }
    ],
    company: [
      { label: "О нас", href: "#" },
      { label: "Блог", href: "#" },
      { label: "Карьера", href: "#" },
      { label: "Контакты", href: "#" }
    ],
    legal: [
      { label: "Конфиденциальность", href: "#" },
      { label: "Условия", href: "#" },
      { label: "Безопасность", href: "#" },
      { label: "Статус", href: "#" }
    ]
  };

  return (
    <footer className="bg-surface border-t border-border py-16 px-[80px]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-5 gap-12 mb-12">
          <div className="col-span-2">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center">
                <span className="font-semibold text-white">EX</span>
              </div>
              <span className="font-semibold text-xl">ExportHub</span>
            </motion.div>
            <p className="text-muted text-sm mb-6">
              Профессиональный инструмент для экспорта, анализа и документирования вашего кода с поддержкой AI
            </p>
            <div className="flex items-center gap-3">
              <motion.a
                whileHover={{ y: -2 }}
                href="#"
                className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                <Github className="h-5 w-5" />
              </motion.a>
              <motion.a
                whileHover={{ y: -2 }}
                href="#"
                className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </motion.a>
              <motion.a
                whileHover={{ y: -2 }}
                href="#"
                className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </motion.a>
              <motion.a
                whileHover={{ y: -2 }}
                href="#"
                className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                <Mail className="h-5 w-5" />
              </motion.a>
            </div>
          </div>

          <div>
            <h4 className="mb-4">Продукт</h4>
            <ul className="space-y-3">
              {links.product.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-muted hover:text-primary transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4">Компания</h4>
            <ul className="space-y-3">
              {links.company.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-muted hover:text-primary transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4">Правовая информация</h4>
            <ul className="space-y-3">
              {links.legal.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-muted hover:text-primary transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted">
            © 2025 ExportHub. Все права защищены.
          </p>
          <p className="text-sm text-muted">
            Создано с ❤️ для разработчиков
          </p>
        </div>
      </div>
    </footer>
  );
}
