import { BrainCircuit, Code2, HeartHandshake, Layers3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const metadata = { title: "About" };

const principles = [
  {
    icon: BrainCircuit,
    title: "Agentic thinking",
    text: "Move past prompting into systems that reason, use tools, and finish work.",
  },
  {
    icon: Code2,
    title: "Learning by building",
    text: "Every concept turns into working software you can defend in review.",
  },
  {
    icon: Layers3,
    title: "Production engineering",
    text: "Architecture, security, testing, and operations are part of the craft.",
  },
  {
    icon: HeartHandshake,
    title: "Community first",
    text: "Progress shared early is worth more than progress perfected alone.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About the cohort"
        title="AI AMC"
        description="Agentic AI Masterclass is a focused programme for engineers who want to build the next generation of AI products — and ship them responsibly."
      />

      <Card className="relative overflow-hidden p-7 sm:p-10">
        <span
          aria-hidden
          className="absolute -top-24 -right-24 size-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--ember)" }}
        />
        <blockquote className="font-display text-ink relative max-w-3xl text-[26px] leading-[1.3] font-semibold text-balance sm:text-[34px]">
          Learn to build agents before agents learn to replace you.
        </blockquote>
        <p className="text-dim relative mt-6 max-w-xl text-sm leading-7">
          Weeks of building, reviewing, and shipping alongside people doing the
          same work. This platform is where that record lives.
        </p>
      </Card>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {principles.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="p-5">
            <span className="text-ember grid size-10 place-items-center rounded-xl bg-[var(--ember-soft)]">
              <Icon size={18} />
            </span>
            <h2 className="font-display text-ink mt-5 text-sm font-semibold">
              {title}
            </h2>
            <p className="text-dim mt-2 text-xs leading-5">{text}</p>
          </Card>
        ))}
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <p className="text-dim flex items-center gap-2.5 text-xs">
            <span className="bg-ember h-3.5 w-[3px] rounded-full" />
            Creator and co-founder
          </p>
          <h2 className="font-display text-ink mt-4 text-xl font-semibold">
            Nisarg Kadam
          </h2>
        </Card>
        <Card className="p-6">
          <p className="text-dim flex items-center gap-2.5 text-xs">
            <span className="bg-ember h-3.5 w-[3px] rounded-full" />
            Co-founder
          </p>
          <h2 className="font-display text-ink mt-4 text-xl font-semibold">
            Rahul Dusane
          </h2>
        </Card>
      </section>
    </>
  );
}
