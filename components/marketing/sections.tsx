import {
  CalendarPlus,
  CheckSquare,
  FileText,
  Github,
  Mail,
  MessageCircleQuestion,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export function Steps() {
  const steps = [
    {
      icon: Upload,
      title: "Drop in the recording",
      body: "Anything you already have. A Zoom export, a voice memo from your phone, a file off your laptop. You do not need a bot in the meeting.",
    },
    {
      icon: FileText,
      title: "Read your notes",
      body: "A short summary, what was decided, what is still open, and a to-do list with a name and a date on each line. Fix anything that is wrong by clicking it.",
    },
    {
      icon: Mail,
      title: "Send the follow-up",
      body: "The recap email is already written in your voice. Check it, hit the button, and it opens in your own Gmail with every word filled in.",
    },
  ];

  return (
    <section id="how" aria-labelledby="how-heading" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <p className="text-sm font-medium text-done-text">Three steps</p>
          <h2 id="how-heading" className="mt-2 max-w-[18ch] text-h1">
            It takes about a minute of your attention
          </h2>
        </Reveal>

        <RevealGroup count={steps.length} className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <RevealItem key={s.title}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-done-soft text-done-text">
                    <s.icon className="size-4" aria-hidden />
                  </span>
                  <span className="font-mono text-xs tabular text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="text-h2">{s.title}</h3>
                <p className="max-w-[38ch] text-muted-foreground">{s.body}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

export function WhatYouGet() {
  const items = [
    {
      icon: FileText,
      title: "Notes worth keeping",
      body: "A summary, the decisions, and the questions nobody answered. Each line links back to the second it was said.",
      span: "md:col-span-2",
    },
    {
      icon: CheckSquare,
      title: "To-dos with owners",
      body: "Who said they would do it, and by when.",
    },
    {
      icon: CalendarPlus,
      title: "Deadlines on your calendar",
      body: "One click gives you every dated to-do as a calendar file. Works with Google, Outlook and Apple.",
    },
    {
      icon: Mail,
      title: "A follow-up already written",
      body: "Pick the tone, edit anything, then open it in your own Gmail. SyncMind never sends it for you, and never could.",
      span: "md:col-span-2",
    },
    {
      icon: MessageCircleQuestion,
      title: "Ask the meeting",
      body: "\"What did we say about pricing?\" You get an answer with the timestamp it came from.",
    },
    {
      icon: Search,
      title: "Search everything",
      body: "Every meeting you have ever uploaded, in one search box.",
    },
  ];

  return (
    <section
      id="what-you-get"
      aria-labelledby="get-heading"
      className="border-t border-border py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <p className="text-sm font-medium text-done-text">What lands in your account</p>
          <h2 id="get-heading" className="mt-2 max-w-[20ch] text-h1">
            Six things, every time, without asking
          </h2>
        </Reveal>

        <RevealGroup count={items.length} className="mt-12 grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <RevealItem key={item.title} className={item.span}>
              <div className="flex h-full flex-col gap-2.5 rounded-lg border border-border bg-card p-5 shadow-sm">
                <item.icon className="size-5 text-done-text" aria-hidden />
                <h3 className="text-h3">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

export function Privacy() {
  const points = [
    {
      icon: Trash2,
      title: "Recordings delete themselves",
      body: "Your audio is removed 7 days after it is processed. You can make that as short as 1 day, or keep a meeting pinned if you need it longer.",
    },
    {
      icon: ShieldCheck,
      title: "SyncMind cannot touch your email or calendar",
      body: "It never asks for access to either. The follow-up opens in your own Gmail and the dates arrive as a file you open yourself, so there is nothing for it to get wrong.",
    },
    {
      icon: Github,
      title: "You can read the code",
      body: "The whole thing is open source. If you want to know exactly what happens to your recording, go and look.",
    },
  ];

  return (
    <section
      id="privacy"
      aria-labelledby="privacy-heading"
      className="border-t border-border py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Reveal>
            <p className="text-sm font-medium text-done-text">Your recordings</p>
            <h2 id="privacy-heading" className="mt-2 max-w-[16ch] text-h1">
              They stay yours, and they do not stick around
            </h2>
          </Reveal>

          <RevealGroup count={points.length} className="flex flex-col gap-6">
            {points.map((p) => (
              <RevealItem key={p.title}>
                <div className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                    <p.icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-h3">{p.title}</h3>
                    <p className="mt-1 max-w-[52ch] text-muted-foreground">{p.body}</p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const qs = [
    {
      q: "Do I have to let a bot into my meeting?",
      a: "No. SyncMind never joins a call. You record the meeting however you already do, then upload the file afterwards.",
    },
    {
      q: "What file types work?",
      a: "mp3, m4a, wav, webm, ogg, mp4 and mov, up to two hours. If you upload a video, only the audio is used and the video never leaves your browser.",
    },
    {
      q: "How good is it at knowing who said what?",
      a: "It labels each speaker, and when someone's name is said out loud it works out who that is. Where it is guessing, it says so, and you can rename anyone once to fix it everywhere.",
    },
    {
      q: "Will it send emails without me?",
      a: "It cannot. SyncMind holds no access to your mailbox at all. It hands the finished text to your own Gmail in a new message, and you press send yourself.",
    },
    {
      q: "What does it cost?",
      a: "Nothing. It runs entirely on free tiers, which is why there is a daily limit on how much audio you can process. If you hit it, your meeting waits for the next day rather than failing.",
    },
  ];

  return (
    <section aria-labelledby="faq-heading" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5">
        <Reveal>
          <h2 id="faq-heading" className="text-h1">
            Questions people actually ask
          </h2>
        </Reveal>
        <Reveal delay={0.06}>
          <Accordion type="single" collapsible className="mt-8 border-t border-border">
            {qs.map((item, i) => (
              <AccordionItem key={item.q} value={`q${i}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section aria-labelledby="cta-heading" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="rounded-lg border border-border bg-card px-6 py-14 text-center shadow-sm sm:px-12">
          <h2 id="cta-heading" className="mx-auto max-w-[18ch] text-h1">
            Your next meeting can write itself up
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-muted-foreground">
            Upload something you recorded this week and see what comes back. It takes
            about four minutes for a 45-minute meeting.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">Continue with Google</Link>
            </Button>
            <span className="text-sm text-muted-foreground">Free. No card needed.</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Wordmark />
          <p className="mt-2 text-sm text-muted-foreground">Meetings in. Momentum out.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <a href="#how" className="text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#privacy" className="text-muted-foreground transition-colors hover:text-foreground">
            Privacy
          </a>
          <Link href="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">
            Open the app
          </Link>
          <a
            href="https://github.com/dooddles07/SyncMind"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="size-4" aria-hidden />
            Source
          </a>
        </nav>
      </div>
    </footer>
  );
}
