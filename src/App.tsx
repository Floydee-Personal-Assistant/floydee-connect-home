import { ArrowDown, ArrowDownRight, ArrowUpRight, CalendarDays, Mail, MessageCircle, Mic, ShieldCheck, Smartphone, Target } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

type PrototypeTourStage = "capture" | "recording" | "created" | "notes" | "goals" | "calendar";
type PrototypeMessage = { type: "floydee-prototype-ready" | "floydee-prototype-interacted" };

const tourStages: readonly PrototypeTourStage[] = ["capture", "recording", "created", "notes", "goals", "calendar"];
const tourCopy: Record<PrototypeTourStage, string> = { capture: "Choose voice capture", recording: "Record a thought", created: "Review the new task", notes: "Open the note", goals: "Connect it to a goal", calendar: "See the plan in time" };

function canAutoplay() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isPrototypeMessage(value: unknown): value is PrototypeMessage {
  return typeof value === "object" && value !== null && "type" in value && ((value as { type?: string }).type === "floydee-prototype-ready" || (value as { type?: string }).type === "floydee-prototype-interacted");
}

export default function App() {
  const query = new URLSearchParams(window.location.search);
  const directPrototype = query.get("view") === "prototype" || (query.has("state") && query.get("state") !== "default");
  const baseUrl = import.meta.env.BASE_URL;
  const prototypeUrl = `${baseUrl}prototype.html?theme=${query.get("theme") ?? "light"}&state=${query.get("state") ?? "default"}`;
  const embeddedPrototypeUrl = `${prototypeUrl}&embed=showcase`;
  const [tourStage, setTourStage] = useState<PrototypeTourStage>("capture");
  const [autoplay, setAutoplay] = useState(canAutoplay);
  const [tourPaused, setTourPaused] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [demoReady, setDemoReady] = useState(false);
  const [demoActivated, setDemoActivated] = useState(false);
  const [interestReady, setInterestReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (directPrototype) window.location.replace(prototypeUrl);
  }, [directPrototype, prototypeUrl]);

  useEffect(() => {
    document.body.classList.add("public-showcase");
    const timer = window.setTimeout(() => setPageReady(true), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 720);
    return () => { document.body.classList.remove("public-showcase"); window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateAutoplay = () => setAutoplay(canAutoplay());
    updateAutoplay(); motion.addEventListener("change", updateAutoplay); pointer.addEventListener("change", updateAutoplay);
    return () => { motion.removeEventListener("change", updateAutoplay); pointer.removeEventListener("change", updateAutoplay); };
  }, []);

  useEffect(() => {
    if (!autoplay || tourPaused || demoActivated) return undefined;
    const timer = window.setInterval(() => setTourStage((current) => tourStages[(tourStages.indexOf(current) + 1) % tourStages.length]), 4200);
    return () => window.clearInterval(timer);
  }, [autoplay, tourPaused, demoActivated]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.setAttribute("data-revealed", "true"); }), { threshold: 0.22 });
    document.querySelectorAll<HTMLElement>(".showcase-story, .showcase-closing").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const receivePrototypeMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow || !isPrototypeMessage(event.data)) return;
      if (event.data.type === "floydee-prototype-ready") setDemoReady(true);
      if (event.data.type === "floydee-prototype-interacted") { setDemoActivated(true); setTourPaused(true); }
    };
    window.addEventListener("message", receivePrototypeMessage);
    return () => window.removeEventListener("message", receivePrototypeMessage);
  }, []);

  const activeTourStage = autoplay && !tourPaused && !demoActivated ? tourStage : null;
  useEffect(() => {
    if (demoReady) iframeRef.current?.contentWindow?.postMessage({ type: "floydee-prototype-tour", stage: activeTourStage }, window.location.origin);
  }, [activeTourStage, demoReady]);

  const activateDemo = () => { setDemoActivated(true); setTourPaused(true); };
  const openInterestDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") ?? "").trim(); const company = String(values.get("company") ?? "").trim(); const email = String(values.get("email") ?? "").trim(); const team = String(values.get("team") ?? "").trim();
    setInterestReady(true);
    window.location.href = `mailto:admin@floydee.com?subject=${encodeURIComponent(`Floydee Connect early pilot — ${company || "Interest"}`)}&body=${encodeURIComponent([`Name: ${name}`, `Company: ${company}`, `Work email: ${email}`, `Team size: ${team || "Not shared"}`, "", "I’d like to discuss the Floydee Connect early pilot."].join("\n"))}`;
  };

  if (directPrototype) return <main className="prototype-redirect" aria-live="polite">Opening Floydee Connect prototype…</main>;

  return <main className="showcase" id="top" data-page-ready={pageReady}>
    <div className="showcase-loader" aria-hidden={pageReady}><span>Floydee <b>Connect</b></span><i /></div>
    <header className="showcase-nav" aria-label="Floydee Connect navigation"><a className="showcase-wordmark" href="#top">Floydee <span>Connect</span></a><a className="showcase-contact" href="mailto:admin@floydee.com">Contact <ArrowUpRight aria-hidden="true" size={15} /></a></header>
    <section className="showcase-layout" aria-labelledby="showcase-title">
      <div className="showcase-hero"><p className="showcase-eyebrow">Commitment-to-Capacity Intelligence</p><h1 id="showcase-title">Helps you plan.</h1><p className="showcase-intro">Bring your real and digital context together. See what matters, what fits, and what needs attention.</p><div className="showcase-hero-path" aria-label="Floydee Connect story"><span>Capture context</span><span>Understand priorities</span><span>Protect the plan</span></div><a className="showcase-story-link" href="#context">See how it works <ArrowDown aria-hidden="true" size={16} /></a></div>
      <aside className="showcase-demo" aria-label="Interactive Floydee Connect prototype" data-tour-stage={activeTourStage ?? "manual"} data-demo-ready={demoReady} data-demo-activated={demoActivated}>{!demoActivated ? <button className="showcase-demo-callout" type="button" onClick={activateDemo} onFocus={activateDemo} aria-label="Open interactive prototype"><span>Try it</span><strong>Click the phone to explore.</strong><ArrowDownRight aria-hidden="true" size={28} /></button> : null}<div className="showcase-phone">{pageReady ? <iframe ref={iframeRef} src={embeddedPrototypeUrl} title="Interactive Floydee Connect prototype" onLoad={() => setDemoReady(true)} /> : null}</div><p className="showcase-demo-status" aria-live="polite"><span>{demoReady ? "Live prototype" : "Preparing prototype"}</span>{activeTourStage ? tourCopy[activeTourStage] : "Hover or tap the phone to take control."}</p></aside>
    </section>
    <section className="showcase-story" id="context" aria-labelledby="story-title"><div className="story-heading"><p>How it works</p><h2 id="story-title">From context to a plan.</h2><span>Floydee Connect brings together what is happening, what matters, and what you can realistically deliver.</span></div><div className="story-pillars"><article><p>01 / Context</p><h3>Capture what matters.</h3><span>Deliberate device capture and approved sources bring context together with permission and proof.</span><div className="source-stream" aria-label="Permitted context sources"><i><Smartphone aria-hidden="true" size={18} />Device capture</i><i><CalendarDays aria-hidden="true" size={18} />Calendar</i><i><Mic aria-hidden="true" size={18} />Meetings</i><i><Mail aria-hidden="true" size={18} />Mail</i><i><MessageCircle aria-hidden="true" size={18} />Work tools</i></div></article><article><p>02 / Intelligence</p><h3>Understand the signal.</h3><span>Topics, commitments, goals, and evidence become clear enough to review and correct.</span><div className="intelligence-packet" aria-label="Reviewable intelligence packet"><span>Topic</span><b>Release readiness</b><small>Goal · Ship Capture V1</small><em>Capacity checked</em></div></article><article><p>03 / Plan</p><h3>Protect the promise.</h3><span>See realistic capacity, spot a risk early, and choose the least-disruptive next step.</span><div className="plan-signal" aria-label="A planned commitment"><Target aria-hidden="true" size={22} /><span><b>Next commitment</b><small>Review delivery options</small></span><i>Ready to review</i></div></article></div><p className="showcase-loop" aria-label="Floydee Connect loop">Promise <span>→</span> Capacity <span>→</span> Risk <span>→</span> Intervention <span>→</span> Proof of delivery <span>→</span> Learning</p></section>
    <section className="showcase-closing" aria-labelledby="pilot-title"><div className="showcase-pilot"><div><p className="showcase-kicker">Early pilot</p><h2 id="pilot-title">Build the planning layer with us.</h2><p>For a small group of teams that want to make commitments, capacity, and delivery more visible.</p><small>Share your details to open an email draft. Nothing is sent from this site.</small></div><form className="pilot-form" onSubmit={openInterestDraft}><label>Name<input name="name" autoComplete="name" required /></label><label>Work email<input name="email" type="email" autoComplete="email" required /></label><label>Company<input name="company" autoComplete="organization" required /></label><label>Team size <select name="team" defaultValue=""><option value="" disabled>Select one</option><option>1–10</option><option>11–50</option><option>51–250</option><option>251+</option></select></label><button type="submit" data-loading={interestReady || undefined}>Show interest <ArrowUpRight aria-hidden="true" size={17} /></button>{interestReady ? <p role="status">Your email draft is ready to review.</p> : null}</form></div><footer className="showcase-footer"><p>© 2026 Floydee Innovations Private Limited</p><p className="showcase-trust"><ShieldCheck aria-hidden="true" size={16} />Your data stays protected. You stay in control.</p><a href="mailto:admin@floydee.com">admin@floydee.com</a></footer></section>
  </main>;
}
