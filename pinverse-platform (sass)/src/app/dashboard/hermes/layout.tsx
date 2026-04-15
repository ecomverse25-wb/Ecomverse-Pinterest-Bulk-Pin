import HermesLayout from "@/components/hermes/HermesLayout";

export default function HermesSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HermesLayout>{children}</HermesLayout>;
}
