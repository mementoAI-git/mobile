/**
 * SettingsIcons — Untitled UI icon paths wrapped for react-native-svg.
 *
 * All icons are 24×24 viewBox, stroked (fill="none"), strokeWidth 2,
 * strokeLinecap="round", strokeLinejoin="round" — matching Untitled UI's
 * visual language exactly.
 *
 * Path data extracted from @untitledui/icons@0.0.22 (DOM package).
 * Wrapped here as react-native-svg components for RN compatibility.
 */

import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const base = {
  fill: 'none' as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// ─── Security / Auth ──────────────────────────────────────────────────────────

export const UiLock01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M17 10V8A5 5 0 0 0 7 8v2m5 4.5v2M8.8 21h6.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C20 18.72 20 17.88 20 16.2v-1.4c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C17.72 10 16.88 10 15.2 10H8.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C4 12.28 4 13.12 4 14.8v1.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C6.28 21 7.12 21 8.8 21Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiFingerprint01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M6.918 3.386A9.954 9.954 0 0 1 12 2c5.523 0 10 4.477 10 10v.1M3.38 6.925A9.954 9.954 0 0 0 2 12c0 4.66 3.187 8.575 7.5 9.685m11.208-4.764a10.02 10.02 0 0 1-6.208 4.764m-.41-15.311A6 6 0 0 0 6.377 14.1m11.247-4.192a6 6 0 0 1-7.701 7.723M12 10v4"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiShieldTick = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="m9 11.5 2 2L15.5 9m4.5 3c0 4.908-5.354 8.478-7.302 9.615-.221.129-.332.194-.488.227a1.137 1.137 0 0 1-.42 0c-.156-.034-.267-.098-.488-.227C9.354 20.478 4 16.908 4 12V7.217c0-.799 0-1.199.13-1.542a2 2 0 0 1 .548-.79c.276-.243.65-.383 1.398-.664l5.362-2.01c.208-.078.312-.117.419-.133a1 1 0 0 1 .286 0c.107.016.21.055.419.133l5.362 2.01c.748.28 1.123.421 1.398.664a2 2 0 0 1 .547.79c.131.343.131.743.131 1.542V12Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiShieldOff = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="m8.809 3.197 2.63-.986c.207-.078.311-.117.418-.133a1 1 0 0 1 .286 0c.107.016.21.055.419.133l5.362 2.01c.748.28 1.123.421 1.398.664a2 2 0 0 1 .547.79c.131.343.131.743.131 1.542V12c0 .72-.115 1.412-.318 2.07m-2.06 3.555c-1.686 1.96-3.834 3.354-4.922 3.989-.223.13-.334.194-.49.228a1.137 1.137 0 0 1-.42 0c-.156-.034-.267-.098-.488-.227C9.354 20.478 4 16.908 4 12V5.776c0-.467.29-.885.727-1.049M3 3l18 18"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiAlertTriangle = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 9v4m0 4h.01M10.615 3.892 2.39 18.098c-.456.788-.684 1.182-.65 1.506a1 1 0 0 0 .406.705c.263.191.718.191 1.629.191h16.45c.91 0 1.365 0 1.628-.191a1 1 0 0 0 .407-.705c.034-.324-.195-.718-.65-1.506L13.383 3.892c-.454-.785-.681-1.178-.978-1.31a1 1 0 0 0-.813 0c-.296.132-.523.525-.978 1.31Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

// ─── People ───────────────────────────────────────────────────────────────────

export const UiUsers01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22 21v-2a4.002 4.002 0 0 0-3-3.874M15.5 3.291a4.001 4.001 0 0 1 0 7.418M17 21c0-1.864 0-2.796-.305-3.53a4 4 0 0 0-2.164-2.165C13.796 15 12.864 15 11 15H8c-1.864 0-2.796 0-3.53.305a4 4 0 0 0-2.166 2.164C2 18.204 2 19.136 2 21M13.5 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiUserCircle = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M5.316 19.438A4.001 4.001 0 0 1 9 17h6a4.001 4.001 0 0 1 3.684 2.438M16 9.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm6 2.5c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

// ─── Communication ────────────────────────────────────────────────────────────

export const UiPhone01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 17.5h.01M8.2 22h7.6c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874C19 20.48 19 19.92 19 18.8V5.2c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C17.48 2 16.92 2 15.8 2H8.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C5 3.52 5 4.08 5 5.2v13.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C6.52 22 7.08 22 8.2 22Zm4.3-4.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiMessageChatSquare = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="m10 15-3.075 3.114c-.43.434-.644.651-.828.666a.5.5 0 0 1-.421-.172c-.12-.14-.12-.446-.12-1.056v-1.56c0-.548-.449-.944-.99-1.024v0a3 3 0 0 1-2.534-2.533C2 12.219 2 11.96 2 11.445V6.8c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C4.28 2 5.12 2 6.8 2h7.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C19 4.28 19 5.12 19 6.8V11m0 11-2.176-1.513c-.306-.213-.46-.32-.626-.395a2.002 2.002 0 0 0-.462-.145c-.18-.033-.367-.033-.74-.033H13.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C10 18.394 10 17.834 10 16.714V14.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C11.52 11 12.08 11 13.2 11h5.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C22 12.52 22 13.08 22 14.2v2.714c0 .932 0 1.398-.152 1.766a2 2 0 0 1-1.083 1.082c-.367.152-.833.152-1.765.152V22Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiMail01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="m2 7 8.165 5.715c.661.463.992.695 1.351.784a2 2 0 0 0 .968 0c.36-.09.69-.32 1.351-.784L22 7M6.8 20h10.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C22 17.72 22 16.88 22 15.2V8.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C19.72 4 18.88 4 17.2 4H6.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C2 6.28 2 7.12 2 8.8v6.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C4.28 20 5.12 20 6.8 20Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

// ─── Finance / Billing ────────────────────────────────────────────────────────

export const UiCreditCard01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22 10H2m0-1.8v7.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C3.52 19 4.08 19 5.2 19h13.6c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874C22 17.48 22 16.92 22 15.8V8.2c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C20.48 5 19.92 5 18.8 5H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 6.52 2 7.08 2 8.2Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiReceipt = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M4 7.8c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C6.28 3 7.12 3 8.8 3h6.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C20 5.28 20 6.12 20 7.8V21l-2.75-2-2.5 2L12 19l-2.75 2-2.5-2L4 21V7.8Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiStars01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="m6.5 13 .784 1.569c.266.53.399.796.576 1.026a3 3 0 0 0 .545.545c.23.177.495.31 1.026.575L11 17.5l-1.569.785c-.53.265-.796.398-1.026.575a3 3 0 0 0-.545.545c-.177.23-.31.495-.576 1.026L6.5 22l-.784-1.569c-.266-.53-.399-.796-.576-1.026a3 3 0 0 0-.545-.545c-.23-.177-.495-.31-1.026-.575L2 17.5l1.569-.785c.53-.265.796-.398 1.026-.575a3 3 0 0 0 .545-.545c.177-.23.31-.495.576-1.026L6.5 13ZM15 2l1.179 3.064c.282.734.423 1.1.642 1.409a3 3 0 0 0 .706.706c.309.22.675.36 1.409.642L22 9l-3.064 1.179c-.734.282-1.1.423-1.409.642a3 3 0 0 0-.706.706c-.22.309-.36.675-.642 1.409L15 16l-1.179-3.064c-.282-.734-.423-1.1-.642-1.409a3 3 0 0 0-.706-.706c-.309-.22-.675-.36-1.409-.642L8 9l3.064-1.179c.734-.282 1.1-.423 1.409-.642a3 3 0 0 0 .706-.706c.22-.309.36-.675.642-1.409L15 2Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

// ─── Data / Storage ───────────────────────────────────────────────────────────

export const UiDatabase01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M21 5c0 1.657-4.03 3-9 3S3 6.657 3 5m18 0c0-1.657-4.03-3-9-3S3 3.343 3 5m18 0v14c0 1.66-4 3-9 3s-9-1.34-9-3V5m18 7c0 1.66-4 3-9 3s-9-1.34-9-3"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiDownloadCloud01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M4 16.242A4.5 4.5 0 0 1 6.08 8.02a6.002 6.002 0 0 1 11.84 0A4.5 4.5 0 0 1 20 16.242M8 17l4 4m0 0 4-4m-4 4v-9"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

// ─── Privacy / Visibility ─────────────────────────────────────────────────────

export const UiEye = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M2.42 12.713c-.136-.215-.204-.323-.242-.49a1.173 1.173 0 0 1 0-.446c.038-.167.106-.274.242-.49C3.546 9.505 6.895 5 12 5s8.455 4.505 9.58 6.287c.137.215.205.323.243.49.029.125.029.322 0 .446-.038.167-.106.274-.242.49C20.455 14.495 17.105 19 12 19c-5.106 0-8.455-4.505-9.58-6.287Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
    <Path
      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

// ─── AI / Intelligence ────────────────────────────────────────────────────────

export const UiLightning01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M13 2 4.093 12.688c-.348.418-.523.628-.525.804a.5.5 0 0 0 .185.397c.138.111.41.111.955.111H12l-1 8 8.907-10.688c.348-.418.523-.628.525-.804a.5.5 0 0 0-.185-.397c-.138-.111-.41-.111-.955-.111H12l1-8Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiZapFast = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M9 17.5H3.5m3-5.5H2m7-5.5H4M17 3l-6.596 9.235c-.292.409-.438.613-.432.784a.5.5 0 0 0 .194.377c.135.104.386.104.889.104H16L15 21l6.596-9.235c.292-.409.438-.613.432-.784a.5.5 0 0 0-.194-.377c-.135-.104-.386-.104-.889-.104H16L17 3Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

// ─── Actions / Navigation ─────────────────────────────────────────────────────

export const UiLogOut01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="m16 17 5-5m0 0-5-5m5 5H9m0-9H7.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C3 5.28 3 6.12 3 7.8v8.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C5.28 21 6.12 21 7.8 21H9"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiCopy01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M5 15c-.932 0-1.398 0-1.765-.152a2 2 0 0 1-1.083-1.083C2 13.398 2 12.932 2 12V5.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C3.52 2 4.08 2 5.2 2H12c.932 0 1.398 0 1.765.152a2 2 0 0 1 1.083 1.083C15 3.602 15 4.068 15 5m-2.8 17h6.6c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874C22 20.48 22 19.92 22 18.8v-6.6c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C20.48 9 19.92 9 18.8 9h-6.6c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C9 10.52 9 11.08 9 12.2v6.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C10.52 22 11.08 22 12.2 22Z"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiRefreshCw05 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M20.453 12.893A8.5 8.5 0 0 1 4.638 16.25l-.25-.433m-.842-4.71A8.5 8.5 0 0 1 19.361 7.75l.25.433M3.493 18.066l.732-2.732 2.732.732m10.085-8.132 2.732.732.732-2.732"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiLinkExternal01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M21 9V3m0 0h-6m6 0-8 8m-3-6H7.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C3 7.28 3 8.12 3 9.8v6.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C5.28 21 6.12 21 7.8 21h6.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C19 18.72 19 17.88 19 16.2V14"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);

export const UiTrash01 = ({ size = 22, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M16 6v-.8c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C14.48 2 13.92 2 12.8 2h-1.6c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C8 3.52 8 4.08 8 5.2V6m2 5.5v5m4-5v5M3 6h18m-2 0v11.2c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C16.72 22 15.88 22 14.2 22H9.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C5 19.72 5 18.88 5 17.2V6"
      stroke={color} strokeWidth={strokeWidth} {...base}
    />
  </Svg>
);
