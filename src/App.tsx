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
          <p className="showcase-eyebrow">Floydee Connect</p>
          <h1 id="showcase-title">Helps you plan.</h1>
          <p className="showcase-intro">See your commitments, your capacity, and what needs attention.</p>
          <p className="showcase-note">Try the prototype on the right.</p>
        </div>
        <aside className="showcase-demo" aria-label="Interactive Floydee Connect prototype">
          <MobileRuntime><Prototype /></MobileRuntime>
        </aside>
      </section>
      <section className="showcase-proof" aria-label="What the prototype demonstrates">
        <p>Promise <span>→</span> Capacity <span>→</span> Risk <span>→</span> Next step <span>→</span> Delivery <span>→</span> Learning</p>
      </section>
      <footer className="showcase-footer">
        <p>Prototype. Synthetic data only.</p>
        <a href="mailto:admin@floydee.com">admin@floydee.com</a>
      </footer>
    </main>
  );
}
