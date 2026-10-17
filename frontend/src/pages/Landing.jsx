import { LandingNavbar } from '@components/landing/LandingNavbar';
import { HeroSection } from '@components/landing/HeroSection';
import { FeaturesSection } from '@components/landing/FeaturesSection';
import { LandingFooter } from '@components/landing/LandingFooter';

const Landing = () => (
  <div className="min-h-screen bg-background">
    <LandingNavbar />
    <HeroSection />
    <FeaturesSection />
    <LandingFooter />
  </div>
);

export default Landing;
