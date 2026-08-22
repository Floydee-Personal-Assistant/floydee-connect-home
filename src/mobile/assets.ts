export function mobileAsset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export const mobileAssets = {
  iphoneBezel: mobileAsset("/assets/iphone/Bezel.png"),
  iphoneKeyboard: mobileAsset("/assets/iphone/Keyboard.png"),
  androidKeyboard: mobileAsset("/assets/android/Keyboard.png"),
  pixel10Bezel: mobileAsset("/assets/android/Pixel10.png"),
} as const;
