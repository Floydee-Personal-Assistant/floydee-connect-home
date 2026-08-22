import { ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { MobileRuntime } from "./mobile";
import Prototype from "./Prototype";

export default function App() {
  useEffect(() => {
    document.body.classList.add("public-showcase");
    return () => document.body.classList.remove("public-showcase");
  }, []);

  return (
    <main className="showcase" id="top">
      <header className="showcase-nav" aria-label="Floydee Connect navigation">
        <a className="showcase-wordmark" href="#top">Floydee <span>Connect</span></a>
        <a className="showcase-contact" href="mailto:admin@floydee.com">Contact <ArrowUpRight aria-hidden="true" size={15} /></a>
      </header>
      <section className="showcase-layout" aria-label="Floydee Connect overview and interactive prototype">
        <div className="showcase-hero">
          <p className="showcase-eyebrow">Commitment-to-Capacity Intelligence</p>
          <h1 id="showcase-title">Make the work you promised visible.</h1>
          <p className="showcase-intro">Floydee Connect helps people see what they have committed to, whether realistic capacity exists, and the safest next step when delivery is at risk.</p>
          <p className="showcase-note">Try the live interactive prototype alongside.</p>
        </div>
        <aside className="showcase-demo" aria-label="Interactive Floydee Connect prototype">
          <MobileRuntime><Prototype /></MobileRuntime>
        </aside>
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
