import { ArrowDown, ArrowUpRight, CalendarDays, Mail, MessageCircle, Mic, ShieldCheck, Smartphone, Target } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MobileRuntime } from "./mobile";
import Prototype, { type PrototypeTourStage } from "./Prototype";

const tourStages: readonly PrototypeTourStage[] = ["capture", "recording", "created", "notes", "goals", "calendar"];

const tourCopy: Record<PrototypeTourStage, string> = {
  capture: "Choose voice capture",
  recording: "Record a thought",
  created: "Review the new task",
  notes: "Open the note",
  goals: "Connect it to a goal",
  calendar: "See the plan in time",
};

function canAutoplay() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function App() {
  const query = new URLSearchParams(window.location.search);
  const directPrototype = query.get("view") === "prototype" || (query.has("state") && query.get("state") !== "default");
  const [tourStage, setTourStage] = useState<PrototypeTourStage>("capture");
  const [autoplay, setAutoplay] = useState(canAutoplay);
  const [tourPaused, setTourPaused] = useState(false);
  const [interestReady, setInterestReady] = useState(false);
  const demoRef = useRef<HTMLElement>(null);
  const resumeTimer = useRef<number | undefined>(undefined);
  const tourTransitioning = useRef(true);

  useEffect(() => {
    document.body.classList.add("public-showcase");
    return () => document.body.classList.remove("public-showcase");
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateAutoplay = () => setAutoplay(canAutoplay());

    updateAutoplay();
    motion.addEventListener("change", updateAutoplay);
    pointer.addEventListener("change", updateAutoplay);
    return () => {
      motion.removeEventListener("change", updateAutoplay);
      pointer.removeEventListener("change", updateAutoplay);
    };
  }, []);

  useEffect(() => {
    if (!autoplay || tourPaused) return undefined;

    const timer = window.setInterval(() => {
      setTourStage((current) => tourStages[(tourStages.indexOf(current) + 1) % tourStages.length]);
    }, 4800);

    return () => window.clearInterval(timer);
  }, [autoplay, tourPaused]);

  useEffect(() => {
    if (!autoplay || tourPaused) return undefined;
    tourTransitioning.current = true;
    const timer = window.setTimeout(() => { tourTransitioning.current = false; }, 400);
    return () => window.clearTimeout(timer);
  }, [autoplay, tourPaused, tourStage]);

  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  useEffect(() => {
    const demo = demoRef.current;
    if (!demo) return undefined;

    const passVerticalScrollToPage = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || event.ctrlKey) return;
      event.preventDefault();
      window.scrollBy({ top: event.deltaY, behavior: "auto" });
    };

    demo.addEventListener("wheel", passVerticalScrollToPage, { capture: true, passive: false });
    return () => demo.removeEventListener("wheel", passVerticalScrollToPage, { capture: true });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.setAttribute("data-revealed", "true");
      }),
      { threshold: 0.22 },
    );
    document.querySelectorAll<HTMLElement>(".showcase-story, .showcase-pillar").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const pauseTour = () => {
    window.clearTimeout(resumeTimer.current);
    setTourPaused(true);
  };

  const resumeTourWhenIdle = () => {
    if (!autoplay) return;
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setTourPaused(false), 3600);
  };

  const openInterestDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") ?? "").trim();
    const company = String(values.get("company") ?? "").trim();
    const email = String(values.get("email") ?? "").trim();
    const team = String(values.get("team") ?? "").trim();
    const subject = `Floydee Connect early pilot — ${company || "Interest"}`;
    const body = [`Name: ${name}`, `Company: ${company}`, `Work email: ${email}`, `Team size: ${team || "Not shared"}`, "", "I’d like to discuss the Floydee Connect early pilot."].join("\n");
    setInterestReady(true);
    window.location.href = `mailto:admin@floydee.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <main className={`showcase${directPrototype ? " is-direct-prototype" : ""}`} id="top">
      <header className="showcase-nav" aria-label="Floydee Connect navigation">
        <a className="showcase-wordmark" href="#top">Floydee <span>Connect</span></a>
        <a className="showcase-contact" href="mailto:admin@floydee.com">Contact <ArrowUpRight aria-hidden="true" size={15} /></a>
      </header>
      <section className="showcase-layout" aria-label="Floydee Connect overview and interactive prototype">
        <div className="showcase-hero">
          <h1 id="showcase-title">Helps you plan.</h1>
          <p className="showcase-intro">Capture permitted context from your real and digital worlds. Turn it into topics, align it to goals, and move your plan forward.</p>
          <p className="showcase-note">From the moments you capture to the promises you keep.</p>
          <div className="showcase-hero-path" aria-label="Floydee Connect story"><span>Capture context</span><span>Understand priorities</span><span>Protect the plan</span></div>
          <a className="showcase-story-link" href="#story">Read the story <ArrowDown aria-hidden="true" size={16} /></a>
        </div>
        <aside
          ref={demoRef}
          className="showcase-demo"
          aria-label="Interactive Floydee Connect prototype"
          data-tour-stage={tourStage}
          data-tour-paused={tourPaused}
          onPointerEnter={pauseTour}
          onPointerLeave={resumeTourWhenIdle}
          onFocusCapture={() => {
            if (!tourTransitioning.current) pauseTour();
          }}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) resumeTourWhenIdle();
          }}
          onPointerDown={pauseTour}
        >
          <div className="showcase-phone">
            <MobileRuntime frameFit="container"><Prototype tourStage={autoplay && !tourPaused && !directPrototype ? tourStage : null} /></MobileRuntime>
          </div>
          <p className="showcase-demo-status" aria-live="polite"><span>{autoplay && !tourPaused && !directPrototype ? "Guided preview" : "Interactive preview"}</span>{autoplay && !tourPaused && !directPrototype ? tourCopy[tourStage] : "Explore at your own pace."}</p>
          <p className="showcase-demo-hint">Hover or tap the phone to take control.</p>
        </aside>
      </section>
      <section className="showcase-story" id="story" aria-label="How Floydee Connect helps">
        <p className="showcase-loop">Promise <span>→</span> Capacity <span>→</span> Risk <span>→</span> Intervention <span>→</span> Proof of delivery <span>→</span> Learning</p>
        <div className="showcase-features">
          <section className="showcase-pillar showcase-pillar-capture">
            <span>01 — Context</span><h2>Capture the world around you</h2><p>With permission, bring together deliberate device capture and approved digital sources.</p>
            <div className="signal-cloud" aria-label="Examples of permitted context sources"><i><Smartphone aria-hidden="true" size={16} />Device</i><i><CalendarDays aria-hidden="true" size={16} />Calendar</i><i><Mic aria-hidden="true" size={16} />Meetings</i><i><Mail aria-hidden="true" size={16} />Mail</i><i><MessageCircle aria-hidden="true" size={16} />Work tools</i></div>
          </section>
          <section className="showcase-pillar showcase-pillar-intelligence">
            <span>02 — Intelligence</span><h2>Understand what matters now</h2><p>Turn context into topics, commitments, and evidence. Use your goals, preferences, and corrections to make priorities clear.</p>
            <div className="intelligence-packet" aria-label="Reviewable intelligence packet"><span>Topic</span><b>Release readiness</b><small>Goal · Ship Capture V1</small><em>Capacity checked</em></div>
          </section>
          <section className="showcase-pillar showcase-pillar-plan">
            <span>03 — Plan</span><h2>Protect the important work</h2><p>See realistic capacity, review risks early, and choose the next step before a meaningful promise slips.</p>
            <div className="plan-signal" aria-label="A planned commitment"><Target aria-hidden="true" size={18} /><span><b>Next commitment</b><small>Review delivery options</small></span><i>Ready to review</i></div>
          </section>
        </div>
      </section>
      <section className="showcase-pilot" aria-labelledby="pilot-title">
        <div>
          <p className="showcase-kicker">Early pilot</p>
          <h2 id="pilot-title">Build the planning layer with us.</h2>
          <p>For a small group of teams that want to make commitments, capacity, and delivery more visible.</p>
          <small>Share your details to open an email draft. Nothing is sent from this site.</small>
        </div>
        <form className="pilot-form" onSubmit={openInterestDraft}>
          <label>Name<input name="name" autoComplete="name" required /></label>
          <label>Work email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Company<input name="company" autoComplete="organization" required /></label>
          <label>Team size <select name="team" defaultValue=""><option value="" disabled>Select one</option><option>1–10</option><option>11–50</option><option>51–250</option><option>251+</option></select></label>
          <button type="submit">Show interest <ArrowUpRight aria-hidden="true" size={17} /></button>
          {interestReady ? <p role="status">Your email draft is ready to review.</p> : null}
        </form>
      </section>
      <footer className="showcase-footer">
        <p>© 2026 Floydee Innovations Private Limited</p>
        <p className="showcase-trust"><ShieldCheck aria-hidden="true" size={16} />Your data stays protected. You stay in control.</p>
        <a href="mailto:admin@floydee.com">admin@floydee.com</a>
      </footer>
    </main>
  );
}
