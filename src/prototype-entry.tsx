import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/roboto/latin-500.css";
import { MobileRuntime } from "./mobile";
import Prototype, { type PrototypeTourStage } from "./Prototype";
import "./styles.css";
import "./prototype.css";

type TourMessage = { type: "floydee-prototype-tour"; stage: PrototypeTourStage | null };
type PresentationMessage = { type: "floydee-prototype-presentation"; mobileFocus: boolean };

function isTourMessage(value: unknown): value is TourMessage {
  return typeof value === "object" && value !== null && "type" in value && (value as { type?: string }).type === "floydee-prototype-tour";
}

function isPresentationMessage(value: unknown): value is PresentationMessage {
  return typeof value === "object" && value !== null && "type" in value && (value as { type?: string }).type === "floydee-prototype-presentation" && typeof (value as { mobileFocus?: unknown }).mobileFocus === "boolean";
}

function notifyParent(type: "floydee-prototype-ready" | "floydee-prototype-interacted") {
  if (window.parent !== window) window.parent.postMessage({ type }, window.location.origin);
}

function PrototypeEntry() {
  const [tourStage, setTourStage] = useState<PrototypeTourStage | null>(null);
  const [mobileFocus, setMobileFocus] = useState(false);
  const embedded = new URLSearchParams(window.location.search).get("embed") === "showcase";

  useEffect(() => {
    const receiveTourStage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (isTourMessage(event.data)) setTourStage(event.data.stage);
      if (isPresentationMessage(event.data)) setMobileFocus(event.data.mobileFocus);
    };
    window.addEventListener("message", receiveTourStage);
    notifyParent("floydee-prototype-ready");
    return () => window.removeEventListener("message", receiveTourStage);
  }, []);

  return <div className="prototype-entry" data-embedded={embedded ? "showcase" : undefined} data-mobile-focus={mobileFocus || undefined} data-tour-stage={tourStage ?? "manual"} onPointerDownCapture={() => notifyParent("floydee-prototype-interacted")}><MobileRuntime frameFit="container"><Prototype tourStage={tourStage} /></MobileRuntime></div>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><PrototypeEntry /></React.StrictMode>);
