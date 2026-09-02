import { BrainCircuit, Code2, HeartHandshake, Layers3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
export const metadata = { title: "About" };
export default function AboutPage() {
  const principles = [
    {
      icon: BrainCircuit,
      title: "Agentic thinking",
      text: "Move beyond prompts into systems that reason, use tools, and deliver outcomes.",
    },
    {
      icon: Code2,
      title: "Learning by building",
      text: "Translate every concept into working, reviewable, production-minded software.",
    },
    {
      icon: Layers3,
      title: "Production engineering",
      text: "Treat architecture, security, testing, and operations as part of the craft.",
    },
    {
      icon: HeartHandshake,
      title: "Community first",
      text: "Learn faster by sharing progress, feedback, and hard-earned context.",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="About the cohort"
        title="AI AMC Nine"
        description="Agentic AI Masterclass is a focused learning experience for engineers who want to build the next generation of AI products."
      />
      <Card className="via-surface to-surface relative overflow-hidden bg-gradient-to-br from-[#241a17] p-7 sm:p-10">
        <div className="bg-accent/10 absolute -top-20 -right-20 size-64 rounded-full blur-3xl" />
        <p className="relative max-w-3xl text-2xl leading-10 font-medium tracking-[-.03em] text-white sm:text-3xl">
          Learn to build agents before agents learn to replace you.
        </p>
        <p className="text-muted relative mt-5 max-w-2xl text-sm leading-7">
          A cohort for ambitious builders who care about both AI capability and
          the engineering discipline required to ship it responsibly.
        </p>
      </Card>
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {principles.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="p-5">
            <span className="bg-accent/10 grid size-10 place-items-center rounded-xl text-[#ff987e]">
              <Icon size={19} />
            </span>
            <h2 className="mt-5 text-sm font-semibold text-white">{title}</h2>
            <p className="text-muted mt-2 text-xs leading-5">{text}</p>
          </Card>
        ))}
      </section>
      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <p className="text-accent text-xs tracking-[.16em] uppercase">
            Creator & Co-Founder
          </p>
          <h2 className="mt-3 text-xl font-semibold text-white">
            Nisarg Kadam
          </h2>
        </Card>
        <Card className="p-6">
          <p className="text-accent text-xs tracking-[.16em] uppercase">
            Co-Founder
          </p>
          <h2 className="mt-3 text-xl font-semibold text-white">
            Rahul Dusane
          </h2>
        </Card>
      </section>
    </>
  );
}
