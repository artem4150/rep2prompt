import { useState } from 'react';
import { Header } from '../components/Header';
import { HeroSection } from '../components/HeroSection';
import { BenefitsSection } from '../components/BenefitsSection';
import { FeaturesSection } from '../components/FeaturesSection';
import { PremiumSection } from '../components/PremiumSection';
import { Footer } from '../components/Footer';
import { AuthDialog } from '../components/AuthDialog';
import styles from '../styles/landing.module.css';
import '../styles/landing.animations.css';

export function LandingPage() {
  const [isDark, setIsDark] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <div className={`${styles.landingRoot} ${isDark ? styles.landingDark : ''}`}>
      <Header
        onAuthClick={() => setAuthDialogOpen(true)}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        isDark={isDark}
      />

      <main className={styles.landingMain}>
        <HeroSection />
        <BenefitsSection />
        <FeaturesSection />
        <PremiumSection />
      </main>

      <Footer />

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
}
