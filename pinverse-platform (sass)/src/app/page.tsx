import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Tools from "@/components/landing/Tools";
import Pricing from "@/components/landing/Pricing";
import Testimonials from "@/components/landing/Testimonials";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { getSiteContentAction } from "@/app/actions/content-actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Fetch content for all sections in parallel
  const [
    heroData,
    featuresData,
    pricingData,
    testimonialsData,
    footerData
  ] = await Promise.all([
    getSiteContentAction('hero'),
    getSiteContentAction('features'),
    getSiteContentAction('pricing'),
    getSiteContentAction('testimonials'),
    getSiteContentAction('footer')
  ]);

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Navbar />
      <Hero content={heroData.content} />
      <Features content={featuresData.content} />
      <Tools />
      <Pricing content={pricingData.content} />
      <Testimonials content={testimonialsData.content} />
      {/* CTA is usually static or part of Hero, but we can make it dynamic later if requested */}
      <CTA />
      <Footer content={footerData.content} />
    </div>
  );
}
