import { LandingDemoStage } from "@/components/landing/demo-stage";
import { LandingFeatures } from "@/components/landing/features";
import { LandingHero } from "@/components/landing/hero";
import { LandingQuickstart } from "@/components/landing/quickstart";
import { LandingAnySchema } from "@/components/landing/schema";
import { LandingTrust } from "@/components/landing/trust";
import { LandingWorkflow } from "@/components/landing/workflow";

export default function HomePage() {
  return (
    <main>
      <LandingHero />
      <LandingDemoStage />
      <LandingAnySchema />
      <LandingWorkflow />
      <LandingQuickstart />
      <LandingFeatures />
      <LandingTrust />
    </main>
  );
}
