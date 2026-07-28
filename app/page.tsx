import { Hero } from "@/components/marketing/hero";
import { Nav } from "@/components/marketing/nav";
import { TimelineSpine } from "@/components/marketing/timeline-spine";
import {
  ClosingCta,
  Faq,
  Footer,
  Privacy,
  Steps,
  WhatYouGet,
} from "@/components/marketing/sections";

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <TimelineSpine />
        <Steps />
        <WhatYouGet />
        <Privacy />
        <Faq />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
