import { useState } from "react";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { BenefitsSection } from "./components/BenefitsSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { PremiumSection } from "./components/PremiumSection";
import { Footer } from "./components/Footer";
import { AuthDialog } from "./components/AuthDialog";

export default function App() {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      <Header onAuthClick={() => setAuthDialogOpen(true)} />
      
      <main>
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
