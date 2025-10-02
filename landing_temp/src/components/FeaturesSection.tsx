import { motion } from "motion/react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { History, Save, Users, BarChart3, Sparkles } from "lucide-react";
import { HistoryDemo } from "./features/HistoryDemo";
import { ProfilesDemo } from "./features/ProfilesDemo";
import { CollaborationDemo } from "./features/CollaborationDemo";
import { AnalyticsDemo } from "./features/AnalyticsDemo";
import { AIFeaturesDemo } from "./features/AIFeaturesDemo";

export function FeaturesSection() {
  const [activeTab, setActiveTab] = useState("history");

  return (
    <section className="py-12 px-[80px]">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="mb-4">
              Мощные инструменты для профессионалов
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Изучите возможности, доступные зарегистрированным пользователям
            </p>
          </motion.div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-12 bg-surface p-2 rounded-2xl border border-border h-auto">
            <TabsTrigger value="history" className="rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
              <History className="h-4 w-4 mr-2" />
              История
            </TabsTrigger>
            <TabsTrigger value="profiles" className="rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Save className="h-4 w-4 mr-2" />
              Профили
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Команда
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Аналитика
            </TabsTrigger>
            <TabsTrigger value="ai" className="rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Sparkles className="h-4 w-4 mr-2" />
              AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <HistoryDemo />
          </TabsContent>

          <TabsContent value="profiles">
            <ProfilesDemo />
          </TabsContent>

          <TabsContent value="collaboration">
            <CollaborationDemo />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDemo />
          </TabsContent>

          <TabsContent value="ai">
            <AIFeaturesDemo />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
