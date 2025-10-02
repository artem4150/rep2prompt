import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Save, Users, BarChart3, Sparkles } from 'lucide-react';
import styles from '../styles/landing.module.css';
import { HistoryDemo } from './features/HistoryDemo';
import { ProfilesDemo } from './features/ProfilesDemo';
import { CollaborationDemo } from './features/CollaborationDemo';
import { AnalyticsDemo } from './features/AnalyticsDemo';
import { AIFeaturesDemo } from './features/AIFeaturesDemo';

export function FeaturesSection() {
  const [activeTab, setActiveTab] = useState('history');

  return (
    <section className={`${styles.landingFeatures} ${styles.landingSection}`}>
      <div className={styles.landingContainer}>
        <div className={styles.landingSectionHeader}>
          <h2 className={styles.landingSectionTitle}>Мощные инструменты для профессионалов</h2>
          <p className={styles.landingSectionSubtitle}>
            Изучите возможности, доступные зарегистрированным пользователям.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={styles.landingTabsList}>
            <TabsTrigger value="history" className={styles.landingTabTrigger}>
              <History className="h-4 w-4" /> История
            </TabsTrigger>
            <TabsTrigger value="profiles" className={styles.landingTabTrigger}>
              <Save className="h-4 w-4" /> Профили
            </TabsTrigger>
            <TabsTrigger value="collaboration" className={styles.landingTabTrigger}>
              <Users className="h-4 w-4" /> Команда
            </TabsTrigger>
            <TabsTrigger value="analytics" className={styles.landingTabTrigger}>
              <BarChart3 className="h-4 w-4" /> Аналитика
            </TabsTrigger>
            <TabsTrigger value="ai" className={styles.landingTabTrigger}>
              <Sparkles className="h-4 w-4" /> AI
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
