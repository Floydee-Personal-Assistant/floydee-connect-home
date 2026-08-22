import { Capacitor } from "@capacitor/core";
import { useEffect, type PropsWithChildren } from "react";
import { MobileDeviceProvider, useMobileDevice } from "./Device";
import { KeyboardDock, KeyboardProvider, useKeyboard } from "./Keyboard";
import { NativeAppFrame, PhoneFrame, type PhoneFrameFit } from "./PhoneFrame";
import { HomeIndicator, StatusBar } from "./components";

export function MobileRuntime({ children, frameFit }: PropsWithChildren<{ frameFit?: PhoneFrameFit }>) {
  const nativeRuntime = Capacitor.isNativePlatform();

  return (
    <MobileDeviceProvider initialDeviceId={nativeRuntime ? "pixel-10" : "iphone"}>
      {nativeRuntime ? (
        <NativeAppFrame>
          <KeyboardProvider>
            <MobileAppViewport nativeRuntime>{children}</MobileAppViewport>
          </KeyboardProvider>
        </NativeAppFrame>
      ) : (
        <PhoneFrame fit={frameFit}>
        <KeyboardProvider>
          <KeyboardPreview />
          <StatusBar />
          <MobileAppViewport>{children}</MobileAppViewport>
          <HomeIndicator />
          <KeyboardDock />
        </KeyboardProvider>
        </PhoneFrame>
      )}
    </MobileDeviceProvider>
  );
}

function MobileAppViewport({ children, nativeRuntime = false }: PropsWithChildren<{ nativeRuntime?: boolean }>) {
  const { device } = useMobileDevice();
  const keyboard = useKeyboard();

  return (
    <div
      className="mobile-app-viewport"
      data-keyboard-visible={keyboard.visible ? "true" : "false"}
      data-native-runtime={nativeRuntime ? "true" : "false"}
      data-platform={device.platform}
      data-testid="mobile-app-viewport"
    >
      {children}
    </div>
  );
}

function KeyboardPreview() {
  const keyboard = useKeyboard();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("keyboard") === "1") {
      keyboard.show();
    }
  }, [keyboard]);

  return null;
}
