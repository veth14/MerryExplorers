"use client";

import type { BodyPartId } from "@/data/body-parts-game";

type Props = {
  onSelectPart: (partId: BodyPartId) => void;
  disabled?: boolean;
  compact?: boolean;
};

type TouchZone = {
  id: BodyPartId;
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
};

const TOUCH_ZONES: TouchZone[] = [
  { id: "head", x: 140, y: 38, width: 120, height: 137, rx: 58 },
  { id: "arms", x: 52, y: 176, width: 102, height: 103, rx: 34 },
  { id: "arms", x: 246, y: 176, width: 102, height: 103, rx: 34 },
  { id: "shoulders", x: 130, y: 164, width: 140, height: 50, rx: 24 },
  { id: "knees", x: 144, y: 349, width: 112, height: 57, rx: 25 },
  { id: "feet", x: 132, y: 413, width: 136, height: 36, rx: 20 },
  { id: "hair", x: 143, y: 15, width: 114, height: 63, rx: 32 },
  { id: "ears", x: 119, y: 69, width: 45, height: 64, rx: 22 },
  { id: "ears", x: 236, y: 69, width: 45, height: 64, rx: 22 },
  { id: "eyes", x: 160, y: 72, width: 80, height: 34, rx: 16 },
  { id: "nose", x: 184, y: 94, width: 32, height: 30, rx: 14 },
  { id: "mouth", x: 168, y: 116, width: 64, height: 34, rx: 17 },
  { id: "elbows", x: 77, y: 218, width: 54, height: 54, rx: 25 },
  { id: "elbows", x: 269, y: 218, width: 54, height: 54, rx: 25 },
  { id: "hands", x: 45, y: 258, width: 58, height: 57, rx: 28 },
  { id: "hands", x: 297, y: 258, width: 58, height: 57, rx: 28 },
];

const PART_LABELS: Record<BodyPartId, string> = {
  head: "Head",
  hair: "Hair",
  eyes: "Eyes",
  ears: "Ears",
  nose: "Nose",
  mouth: "Mouth",
  shoulders: "Shoulders",
  arms: "Arms",
  elbows: "Elbows",
  hands: "Hands",
  knees: "Knees",
  feet: "Feet",
};

export function ExplorerCharacter({ onSelectPart, disabled, compact = false }: Props) {
  const activatePart = (partId: BodyPartId) => {
    if (!disabled) onSelectPart(partId);
  };

  return (
    <div className="relative mx-auto flex w-full max-w-[520px] touch-manipulation select-none flex-col items-center justify-center py-1">
      <div className="relative w-full">
        <svg
          viewBox="0 0 400 500"
          className={`h-auto w-full touch-manipulation drop-shadow-[0_16px_18px_rgba(15,65,80,.16)] ${compact ? "max-h-[min(44dvh,440px)]" : "max-h-[min(62dvh,560px)]"}`}
          role="img"
          aria-label="A friendly young explorer. Tap the body part you want to learn."
        >
          <title>Friendly explorer body-part guide</title>
          <defs>
            <linearGradient id="kid-skin" x1="0" y1="0" x2="0.85" y2="1">
              <stop offset="0" stopColor="#f7c9a0" />
              <stop offset=".55" stopColor="#eeb58b" />
              <stop offset="1" stopColor="#d99570" />
            </linearGradient>
            <linearGradient id="kid-face" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0" stopColor="#ffdfbd" />
              <stop offset=".65" stopColor="#f5c49b" />
              <stop offset="1" stopColor="#e8aa80" />
            </linearGradient>
            <linearGradient id="kid-jacket" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2485c5" />
              <stop offset=".5" stopColor="#1269aa" />
              <stop offset="1" stopColor="#0b4f8e" />
            </linearGradient>
            <linearGradient id="kid-shirt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b6efdc" />
              <stop offset="1" stopColor="#78d3b5" />
            </linearGradient>
            <linearGradient id="kid-shorts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f0bd72" />
              <stop offset="1" stopColor="#d99547" />
            </linearGradient>
            <linearGradient id="kid-shoe" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" />
              <stop offset="1" stopColor="#dbeafe" />
            </linearGradient>
          </defs>

          {/* A soft shadow grounds the character without a busy scene */}
          <ellipse cx="200" cy="475" rx="92" ry="12" fill="#69b99b" opacity=".2" />

          {/* Backpack */}
          <path d="M144 180 Q129 178 127 194 L124 273 Q125 289 145 291 L160 281 L160 194 Z" fill="#f1a44a" stroke="#b96832" strokeWidth="3" />
          <path d="M256 180 Q271 178 273 194 L276 273 Q275 289 255 291 L240 281 L240 194 Z" fill="#f1a44a" stroke="#b96832" strokeWidth="3" />
          <path d="M130 235 Q144 227 155 235 L155 266 Q143 273 129 264 Z M270 235 Q256 227 245 235 L245 266 Q257 273 271 264 Z" fill="#ffd08b" stroke="#c47b3f" strokeWidth="2" />

          {/* Legs and knees */}
          <path d="M158 307 L195 307 L191 418 Q188 432 174 432 Q160 432 158 418 Z" fill="url(#kid-skin)" stroke="#c98762" strokeWidth="2.5" />
          <path d="M205 307 L242 307 L242 418 Q240 432 226 432 Q212 432 209 418 Z" fill="url(#kid-skin)" stroke="#c98762" strokeWidth="2.5" />
          <ellipse cx="176" cy="378" rx="16" ry="17" fill="#f2c19c" stroke="#d3916b" strokeWidth="2" />
          <ellipse cx="224" cy="378" rx="16" ry="17" fill="#f2c19c" stroke="#d3916b" strokeWidth="2" />
          <path d="M168 374 Q176 367 184 374 M216 374 Q224 367 232 374" fill="none" stroke="#d3916b" strokeWidth="2" strokeLinecap="round" />

          {/* Proper explorer shorts cover the hips and upper legs */}
          <path d="M153 296 L247 296 L254 357 L212 357 L200 338 L188 357 L146 357 Z" fill="#c98b55" stroke="#875632" strokeWidth="3" strokeLinejoin="round" />
          <path d="M153 305 Q200 311 247 305" fill="none" stroke="#e8ba82" strokeWidth="3" />
          <path d="M151 315 L174 318 L172 338 L151 336 Z M249 315 L226 318 L228 338 L249 336 Z" fill="#d8a36a" stroke="#9c6d40" strokeWidth="2" />
          <path d="M200 311 L200 337" stroke="#875632" strokeWidth="2.5" />
          <rect x="189" y="298" width="22" height="12" rx="3" fill="#f3c667" stroke="#9c6d40" strokeWidth="2" />

          {/* Sneakers */}
          <path d="M156 417 Q171 409 187 418 L195 442 Q199 456 187 461 L139 461 Q128 458 132 446 Q137 431 156 417 Z" fill="url(#kid-shoe)" stroke="#7896b6" strokeWidth="3" />
          <path d="M244 417 Q229 409 213 418 L205 442 Q201 456 213 461 L261 461 Q272 458 268 446 Q263 431 244 417 Z" fill="url(#kid-shoe)" stroke="#7896b6" strokeWidth="3" />
          <path d="M138 449 Q162 455 191 449 M262 449 Q238 455 209 449" fill="none" stroke="#f5b84d" strokeWidth="5" strokeLinecap="round" />
          <path d="M157 429 L178 436 M153 436 L181 443 M243 429 L222 436 M247 436 L219 443" fill="none" stroke="#4a8cbd" strokeWidth="3" strokeLinecap="round" />
          <path d="M159 466 Q170 469 190 466 M241 466 Q230 469 210 466" fill="none" stroke="#6b859e" strokeWidth="3" strokeLinecap="round" />

          {/* Arms behind the jacket */}
          <path d="M151 180 Q132 187 120 211 L99 250 Q93 263 103 270 Q114 276 122 263 L148 229 L163 211 Z" fill="url(#kid-skin)" stroke="#c98762" strokeWidth="3" />
          <path d="M249 180 Q268 187 280 211 L301 250 Q307 263 297 270 Q286 276 278 263 L252 229 L237 211 Z" fill="url(#kid-skin)" stroke="#c98762" strokeWidth="3" />
          <ellipse cx="106" cy="252" rx="14" ry="15" fill="#edb78f" stroke="#c98762" strokeWidth="2.5" />
          <ellipse cx="294" cy="252" rx="14" ry="15" fill="#edb78f" stroke="#c98762" strokeWidth="2.5" />

          {/* Hands */}
          <path d="M91 264 Q96 255 104 260 Q111 254 117 261 Q125 259 129 267 L126 282 Q122 293 111 297 Q101 295 96 286 L91 276 Z" fill="url(#kid-skin)" stroke="#c98762" strokeWidth="2.5" />
          <path d="M309 264 Q304 255 296 260 Q289 254 283 261 Q275 259 271 267 L274 282 Q278 293 289 297 Q299 295 304 286 L309 276 Z" fill="url(#kid-skin)" stroke="#c98762" strokeWidth="2.5" />
          <path d="M104 278 Q108 282 113 281 M296 278 Q292 282 287 281" fill="none" stroke="#c98762" strokeWidth="1.8" strokeLinecap="round" />

          {/* Shirt and explorer jacket */}
          <path d="M174 164 L226 164 L237 202 L233 311 L167 311 L163 202 Z" fill="url(#kid-shirt)" stroke="#4a9f86" strokeWidth="2.5" />
          <path d="M147 176 Q158 167 176 168 L200 190 L224 168 Q242 167 253 176 L265 294 Q255 308 232 311 L228 204 L200 222 L172 204 L168 311 Q145 308 135 294 Z" fill="url(#kid-jacket)" stroke="#0a4e83" strokeWidth="3" />
          <path d="M176 169 L200 191 L224 169 L215 201 L200 212 L185 201 Z" fill="#f5fbff" stroke="#0a4e83" strokeWidth="2" />
          <path d="M200 212 L200 300" stroke="#a9d8ee" strokeWidth="2.5" strokeDasharray="4 6" />
          <path d="M145 245 Q155 239 168 244 L167 270 Q155 275 145 268 Z M232 244 Q245 239 255 245 L255 268 Q245 275 233 270 Z" fill="#0d5d99" stroke="#5ba6cf" strokeWidth="2" />
          <path d="M150 250 L163 250 M237 250 L250 250" stroke="#c5e9f8" strokeWidth="2" strokeLinecap="round" />
          <path d="M150 183 L162 196 L168 293 M250 183 L238 196 L232 293" fill="none" stroke="#f4bb55" strokeWidth="5" strokeLinecap="round" />
          <circle cx="200" cy="185" r="11" fill="#f4bb55" stroke="#bd7933" strokeWidth="2" />
          <path d="M200 178 L202 183 L207 185 L202 187 L200 192 L198 187 L193 185 L198 183 Z" fill="#fff" />

          {/* Neck */}
          <path d="M184 147 L216 147 L218 176 Q200 188 182 176 Z" fill="url(#kid-skin)" stroke="#c98762" strokeWidth="2" />

          {/* Ears and face */}
          <ellipse cx="140" cy="101" rx="16" ry="23" fill="url(#kid-face)" stroke="#c98762" strokeWidth="2.5" />
          <ellipse cx="260" cy="101" rx="16" ry="23" fill="url(#kid-face)" stroke="#c98762" strokeWidth="2.5" />
          <ellipse cx="141" cy="103" rx="7" ry="12" fill="#e8a780" opacity=".65" />
          <ellipse cx="259" cy="103" rx="7" ry="12" fill="#e8a780" opacity=".65" />
          <path d="M145 63 Q149 34 177 27 Q199 18 222 28 Q249 39 255 67 L251 124 Q246 158 200 165 Q154 158 149 124 Z" fill="url(#kid-face)" stroke="#c98762" strokeWidth="3" />
          <ellipse cx="169" cy="126" rx="12" ry="6" fill="#ec7e7e" opacity=".17" />
          <ellipse cx="231" cy="126" rx="12" ry="6" fill="#ec7e7e" opacity=".17" />

          {/* Hair: soft, swept curls with a clear silhouette */}
          <path d="M146 78 Q133 70 139 54 Q142 43 157 43 Q158 25 177 28 Q187 12 202 24 Q216 10 229 26 Q249 24 251 44 Q267 49 262 67 Q258 78 250 84 L245 65 Q235 71 226 59 Q215 71 203 57 Q192 72 180 61 Q166 77 153 65 Z" fill="#473025" stroke="#35241e" strokeWidth="3" strokeLinejoin="round" />
          <path d="M151 58 Q159 42 174 39 M179 49 Q191 31 204 31 M211 47 Q222 33 238 39" fill="none" stroke="#79533e" strokeWidth="5" strokeLinecap="round" opacity=".8" />
          <path d="M152 68 Q163 58 175 66 Q187 75 198 63 Q211 52 222 65 Q234 74 248 62 L250 81 Q238 91 224 84 Q210 77 199 88 Q185 94 173 83 Q162 77 151 87 Z" fill="#51372b" stroke="#35241e" strokeWidth="2.5" />
          <path d="M161 72 Q170 67 178 74 M194 72 Q202 65 209 72 M226 72 Q234 68 240 73" fill="none" stroke="#9a7357" strokeWidth="2.5" strokeLinecap="round" opacity=".8" />

          {/* Gentle, natural expression */}
          <path d="M164 88 Q176 80 188 87 M212 87 Q224 80 236 88" fill="none" stroke="#51372b" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="177" cy="99" rx="10" ry="12" fill="#fff" />
          <ellipse cx="223" cy="99" rx="10" ry="12" fill="#fff" />
          <ellipse cx="179" cy="100" rx="5.5" ry="7" fill="#376d67" />
          <ellipse cx="221" cy="100" rx="5.5" ry="7" fill="#376d67" />
          <ellipse cx="180" cy="100" rx="2.5" ry="4" fill="#1f2937" />
          <ellipse cx="220" cy="100" rx="2.5" ry="4" fill="#1f2937" />
          <circle cx="181" cy="97" r="2" fill="#fff" />
          <circle cx="221" cy="97" r="2" fill="#fff" />
          <path d="M196 105 Q191 117 197 120 Q201 122 206 119" fill="none" stroke="#c98762" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M184 135 Q200 146 216 135 Q212 151 200 151 Q188 151 184 135 Z" fill="#a64f4d" />
          <path d="M188 137 Q200 141 212 137" fill="none" stroke="#fff5e9" strokeWidth="3" strokeLinecap="round" />

          {/* Large invisible hit targets are drawn last for reliable tablet touches */}
          {TOUCH_ZONES.map((zone, index) => (
            <rect
              key={`${zone.id}-${index}`}
              x={zone.x}
              y={zone.y}
              width={zone.width}
              height={zone.height}
              rx={zone.rx || 0}
              fill="transparent"
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`Touch the ${PART_LABELS[zone.id]}`}
              className="cursor-pointer outline-none"
              onClick={() => activatePart(zone.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  activatePart(zone.id);
                }
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
