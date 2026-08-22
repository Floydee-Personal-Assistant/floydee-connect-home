import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/roboto/latin-500.css";
import { MobileRuntime } from "./mobile";
import Prototype, { type PrototypeTourStage } from "./Prototype";
import "./styles.css";
import "./prototype.css";

type TourMessage = { type: "floydee-prototype-tour"; stage: PrototypeTourStage | null };

function isTourMessage(value: unknown): value is TourMessage {
  return typeof value === "object" && value !== null && "type" in value && (value as { type?: string }).type === "floydee-prototype-tour";
}

function notifyParent(type: "floydee-prototype-ready" | "floydee-prototype-interacted") {
  if (window.parent !== window) window.parent.postMessage({ type }, window.location.origin);
}

function PrototypeEntry() {
  const [tourStage, setTourStage] = useState<PrototypeTourStage | null>(null);

  useEffect(() => {
    const receiveTourStage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || !isTourMessage(event.data)) return;
      setTourStage(event.data.stage);
    };
    window.addEventListener("message", receiveTourStage);
    notifyParent("floydee-prototype-ready");
    return () => window.removeEventListener("message", receiveTourStage);
  }, []);

  return <div className="prototype-entry" data-tour-stage={tourStage ?? "manual"} onPointerDownCapture={() => notifyParent("floydee-prototype-interacted")}><MobileRuntime frameFit="container"><Prototype tourStage={tourStage} /></MobileRuntime></div>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><PrototypeEntry /></React.StrictMode>);
