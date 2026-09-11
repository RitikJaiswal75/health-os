import { Disclaimer } from './components/Disclaimer';
import { FeatureShowcase } from './components/FeatureShowcase';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { InstallGuide } from './components/InstallGuide';
import { Privacy } from './components/Privacy';
import { ValueProps } from './components/ValueProps';

export default function App() {
  return (
    <>
      <main>
        <Hero />
        <ValueProps />
        <FeatureShowcase />
        <InstallGuide />
        <Privacy />
        <Disclaimer />
      </main>
      <Footer />
    </>
  );
}
