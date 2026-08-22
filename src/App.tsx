import { ArrowUpRight, CalendarDays, Mail, MessageCircle, Mic, Smartphone, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MobileRuntime } from "./mobile";
import Prototype, { type PrototypeTourStage } from "./Prototype";

const tourStages: readonly PrototypeTourStage[] = ["capture", "capacity", "risk", "intervention", "proof"];

const tourCopy: Record<PrototypeTourStage, string> = {
  capture: "Capture the promise",
  capacity: "See real capacity",
  risk: "See what needs attention",
  intervention: "Choose the next step",
  proof: "Keep proof and learn",
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

  const pauseTour = () => {
    window.clearTimeout(resumeTimer.current);
    setTourPaused(true);
  };

  const resumeTourWhenIdle = () => {
    if (!autoplay) return;
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setTourPaused(false), 3600);
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
          <p className="showcase-note">Try the prototype on the right.</p>
        </div>
        <aside
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
          <p className="showcase-demo-status" aria-live="polite"><span>{autoplay && !tourPaused && !directPrototype ? "Guided preview" : "Interactive preview"}</span>{autoplay && !tourPaused && !directPrototype ? tourCopy[tourStage] : "Hover or focus pauses the tour."}</p>
        </aside>
      </section>
      <section className="showcase-story" aria-label="How Floydee Connect helps">
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
      <footer className="showcase-footer">
        <p>Prototype. Synthetic data only.</p>
        <a href="mailto:admin@floydee.com">admin@floydee.com</a>
      </footer>
    </main>
  );
}
