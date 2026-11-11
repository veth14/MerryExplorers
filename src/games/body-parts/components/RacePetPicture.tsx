type RacePetPictureProps = {
  name: string;
  color: string;
  background?: string;
  className?: string;
};

export function RacePetPicture({ name, color, background = "#fff", className = "" }: RacePetPictureProps) {
  const nameParts = name.toLowerCase().split(" ");
  const kind = nameParts[nameParts.length - 1] || "puppy";
  const isBunny = kind.includes("bunny") || kind.includes("rabbit");
  const isCat = kind.includes("cat") || kind.includes("fox") || kind.includes("tiger");
  const isPanda = kind.includes("panda") || kind.includes("bear") || kind.includes("koala");
  const isLion = kind.includes("lion");
  const isBird = kind.includes("owl") || kind.includes("penguin");
  const isFrog = kind.includes("frog");

  return (
    <svg viewBox="0 0 112 82" role="img" aria-label={`${name}, a racing pet`} className={className}>
      <title>{name} racing in a little car</title>
      <rect x="1" y="1" width="110" height="80" rx="20" fill={background} opacity=".35" />
      <ellipse cx="58" cy="72" rx="43" ry="6" fill="#244361" opacity=".14" />
      <path d="M6 38 H20 M1 47 H18 M8 56 H21" stroke="#7cccf0" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      <path d="M27 51 Q29 40 39 39 H79 Q87 41 91 53 L99 58 V67 H23 V57 Z" fill={color} stroke="#244361" strokeWidth="3" strokeLinejoin="round" />
      <path d="M37 42 Q41 30 52 30 H72 Q81 32 84 43 Z" fill="#d9f4ff" stroke="#244361" strokeWidth="3" />
      <path d="M47 34 H71 Q76 35 78 42 H43 Z" fill="#9adcf0" />
      <circle cx="39" cy="66" r="8" fill="#263b52" stroke="#fff" strokeWidth="3" />
      <circle cx="82" cy="66" r="8" fill="#263b52" stroke="#fff" strokeWidth="3" />
      <path d="M27 54 H94" stroke="#fff" strokeWidth="3" opacity=".8" />
      <path d="M24 52 L16 48 L18 59 L26 60 Z" fill="#ffb800" stroke="#244361" strokeWidth="2" />
      {isLion && <circle cx="55" cy="27" r="23" fill="#c27631" stroke="#743f24" strokeWidth="3" />}
      {!isLion && <ellipse cx="55" cy="29" rx="21" ry="19" fill={color} stroke="#244361" strokeWidth="3" />}
      {isBunny ? (
        <g fill={color} stroke="#244361" strokeWidth="3">
          <ellipse cx="44" cy="9" rx="7" ry="15" transform="rotate(-13 44 9)" />
          <ellipse cx="62" cy="8" rx="7" ry="16" transform="rotate(10 62 8)" />
          <ellipse cx="44" cy="9" rx="2.7" ry="9" fill="#f8a9ae" stroke="none" />
          <ellipse cx="62" cy="8" rx="2.7" ry="9" fill="#f8a9ae" stroke="none" />
        </g>
      ) : isCat ? (
        <path d="M37 22 L39 5 L51 15 Q56 13 62 15 L75 5 L76 24 Z" fill={color} stroke="#244361" strokeWidth="3" strokeLinejoin="round" />
      ) : isBird ? (
        <path d="M41 18 Q55 2 70 18 L68 23 H43 Z" fill="#f3c644" stroke="#244361" strokeWidth="2.5" />
      ) : isFrog ? (
        <g fill="#81d67d" stroke="#244361" strokeWidth="3">
          <circle cx="42" cy="14" r="8" /><circle cx="68" cy="14" r="8" />
          <circle cx="42" cy="14" r="3" fill="#233347" stroke="none" /><circle cx="68" cy="14" r="3" fill="#233347" stroke="none" />
        </g>
      ) : (
        <g fill={color} stroke="#244361" strokeWidth="3">
          <circle cx="39" cy="19" r="8" /><circle cx="71" cy="19" r="8" />
          <circle cx="39" cy="19" r="3.5" fill="#f6b0a5" stroke="none" /><circle cx="71" cy="19" r="3.5" fill="#f6b0a5" stroke="none" />
        </g>
      )}
      <ellipse cx="55" cy="30" rx="15" ry="12" fill={isPanda ? "#fff" : "#ffdfba"} />
      {isPanda && <g fill="#263346"><ellipse cx="47" cy="25" rx="5" ry="7" transform="rotate(24 47 25)" /><ellipse cx="63" cy="25" rx="5" ry="7" transform="rotate(-24 63 25)" /></g>}
      <circle cx="48" cy="25" r="2.6" fill="#233347" /><circle cx="62" cy="25" r="2.6" fill="#233347" />
      <ellipse cx="55" cy="31" rx="3.5" ry="2.5" fill="#593e36" />
      <path d="M51 35 Q55 39 60 35" fill="none" stroke="#8c5148" strokeWidth="2" strokeLinecap="round" />
      <circle cx="55" cy="46" r="2.5" fill="#fff" opacity=".75" />
    </svg>
  );
}
