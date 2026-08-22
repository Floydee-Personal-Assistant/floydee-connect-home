import {
  createContext,
  type CSSProperties,
  type DragEvent,
  type PropsWithChildren,
  type RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DevicePicker, useMobileDevice } from "./Device";
import { useMobileCursor } from "./MobileCursor";

type ScreenPortalContextValue = {
  screenRef: RefObject<HTMLDivElement | null>;
};

export type PhoneFrameFit = "viewport" | "container";

const ScreenPortalContext = createContext<ScreenPortalContextValue | null>(null);

function suppressNativeDrag(event: DragEvent<HTMLElement>) {
  if (event.target instanceof Element && event.target.closest('[data-native-drag="true"]')) {
    return;
  }

  event.preventDefault();
}

export function useScreenPortal() {
  const context = useContext(ScreenPortalContext);

  if (!context) {
    throw new Error("useScreenPortal must be used inside PhoneFrame");
  }

  return context;
}

function getDeviceScale(deviceWidth: number, deviceHeight: number, container?: HTMLElement | null) {
  if (typeof window === "undefined") return 1;

  const bounds = container?.getBoundingClientRect();
  const availableWidth = bounds ? bounds.width : window.innerWidth - 48;
  const availableHeight = bounds ? bounds.height : window.innerHeight - 48;
  const horizontal = availableWidth / deviceWidth;
  const vertical = availableHeight / deviceHeight;

  return Math.min(horizontal, vertical, 1);
}

function useDeviceScale(deviceWidth: number, deviceHeight: number, stageRef: RefObject<HTMLDivElement | null>, fit: PhoneFrameFit) {
  const [scale, setScale] = useState(() => getDeviceScale(deviceWidth, deviceHeight));

  useEffect(() => {
    const update = () => setScale(getDeviceScale(deviceWidth, deviceHeight, fit === "container" ? stageRef.current : null));

    update();
    window.addEventListener("resize", update);

    const observer = fit === "container" && stageRef.current ? new ResizeObserver(update) : null;
    observer?.observe(stageRef.current as HTMLDivElement);

    return () => {
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [deviceHeight, deviceWidth, fit, stageRef]);

  return scale;
}

export function PhoneFrame({ children, fit = "viewport" }: PropsWithChildren<{ fit?: PhoneFrameFit }>) {
  const { device } = useMobileDevice();
  const { geometry } = device;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const scale = useDeviceScale(geometry.device.width, geometry.device.height, stageRef, fit);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const contextValue = useMemo(() => ({ screenRef }), []);
  const mobileCursor = useMobileCursor();

  return (
    <ScreenPortalContext.Provider value={contextValue}>
      <div className="phone-stage" ref={stageRef} data-phone-fit={fit}>
        <DevicePicker />
        <div
          className="phone-scale-box"
          style={{
            width: geometry.device.width * scale,
            height: geometry.device.height * scale,
          }}
        >
          <div
            className="phone-device"
            data-device={device.id}
            data-platform={device.platform}
            data-testid="phone-frame"
            onDragStartCapture={suppressNativeDrag}
            style={{
              width: geometry.device.width,
              height: geometry.device.height,
              transform: `scale(${scale})`,
            }}
          >
            <img
              className="phone-bezel"
              src={device.bezel}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{ zIndex: device.bezelLayer === "above-screen" ? 2 : 1 }}
            />
            <div
              ref={screenRef}
              className="device-screen"
              data-cursor-debug={mobileCursor.cursorDebug ? "true" : "false"}
              data-device={device.id}
              data-phone-screen
              data-testid="device-screen"
              {...mobileCursor.cursorHandlers}
              style={
                {
                  "--device-safe-area-bottom": `${geometry.safeArea.bottom}px`,
                  left: geometry.screen.x,
                  top: geometry.screen.y,
                  width: geometry.screen.width,
                  height: geometry.screen.height,
                  borderRadius: geometry.screen.radius,
                  zIndex: device.bezelLayer === "above-screen" ? 1 : 2,
                } as CSSProperties
              }
            >
              {children}
              {device.camera ? (
                <span
                  className="device-camera"
                  data-testid="device-camera"
                  aria-hidden="true"
                  style={{
                    width: device.camera.size,
                    height: device.camera.size,
                    top: device.camera.top,
                    left: `calc(50% - ${device.camera.size / 2}px)`,
                  }}
                />
              ) : null}
              {mobileCursor.cursorElement}
            </div>
          </div>
        </div>
      </div>
    </ScreenPortalContext.Provider>
  );
}

/**
 * Native Android and iOS builds use the device's actual screen rather than the
 * browser-only preview bezel. The portal contract stays the same so sheets
 * continue to layer inside the app viewport.
 */
export function NativeAppFrame({ children }: PropsWithChildren) {
  const screenRef = useRef<HTMLDivElement | null>(null);
  const contextValue = useMemo(() => ({ screenRef }), []);

  return (
    <ScreenPortalContext.Provider value={contextValue}>
      <div className="native-phone-frame" data-native-runtime="true">
        <div
          ref={screenRef}
          className="native-app-screen"
          data-native-runtime="true"
          data-phone-screen
          data-testid="native-app-screen"
          onDragStartCapture={suppressNativeDrag}
        >
          {children}
        </div>
      </div>
    </ScreenPortalContext.Provider>
  );
}
