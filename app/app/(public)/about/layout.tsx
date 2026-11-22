import { AboutNav } from "@/components/public/about-nav";
import { PageBody, PageHeader } from "@/components/public/page-parts";

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageBody>
      <PageHeader title="About SIC" intro="Who we are, who leads us, and what we have done." />
      <AboutNav />
      {children}
    </PageBody>
  );
}
