import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileRuntime } from "./mobile";
import Prototype from "./Prototype";

function prototypeRequested() {
  return new URLSearchParams(window.location.search).get("view") === "prototype";
}

export default function App() {
  const [showPrototype, setShowPrototype] = useState(prototypeRequested);

  useEffect(() => {
    const updateFromHistory = () => setShowPrototype(prototypeRequested());
    window.addEventListener("popstate", updateFromHistory);
    return () => window.removeEventListener("popstate", updateFromHistory);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("public-demo", showPrototype);
    document.body.classList.toggle("public-showcase", !showPrototype);
    return () => document.body.classList.remove("public-demo", "public-showcase");
  }, [showPrototype]);

  const openPrototype = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "prototype");
    window.history.pushState({}, "", url);
    setShowPrototype(true);
  };

  const closePrototype = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    window.history.pushState({}, "", url);
    setShowPrototype(false);
  };

  if (showPrototype) {
    return (
      <div className="public-demo-shell">
        <button className="public-demo-exit" type="button" onClick={closePrototype}>
          <ChevronLeft aria-hidden="true" size={17} /> Overview
        </button>
        <MobileRuntime><Prototype /></MobileRuntime>
      </div>
    );
  }

  return <Showcase onExplore={openPrototype} />;
}

function Showcase({ onExplore }: { onExplore: () => void }) {
  return (
    <main className="showcase" id="top">
      <header className="showcase-nav" aria-label="Floydee Connect navigation">
        <a className="showcase-wordmark" href="#top">Floydee <span>Connect</span></a>
        <a className="showcase-contact" href="mailto:admin@floydee.com">Contact <ArrowUpRight aria-hidden="true" size={15} /></a>
      </header>
      <section className="showcase-hero" aria-labelledby="showcase-title">
        <p className="showcase-eyebrow">Commitment-to-Capacity Intelligence</p>
        <h1 id="showcase-title">Make the work you promised visible.</h1>
        <p className="showcase-intro">Floydee Connect helps people see what they have committed to, whether realistic capacity exists, and the safest next step when delivery is at risk.</p>
        <button className="showcase-primary-action" type="button" onClick={onExplore}>Explore the prototype <ArrowUpRight aria-hidden="true" size={18} /></button>
      </section>
      <section className="showcase-proof" aria-label="What the prototype demonstrates">
        <p>Promise <span>→</span> Capacity <span>→</span> Risk <span>→</span> Intervention <span>→</span> Proof of delivery <span>→</span> Learning</p>
      </section>
      <footer className="showcase-footer">
        <p>Interactive concept prototype. Uses synthetic, in-browser data only.</p>
        <a href="mailto:admin@floydee.com">admin@floydee.com</a>
      </footer>
    </main>
  );
}
