import type { BodyPartId } from "@/data/body-parts-game";

const BODY_PART_IMAGES: Record<BodyPartId, string> = {
  head: "HEAD1.png",
  hair: "HAIR.png",
  eyes: "EYES.png",
  ears: "EARS.png",
  nose: "NOSE.png",
  mouth: "MOUTH.png",
  shoulders: "SHOULDERS.png",
  arms: "ARMS.png",
  elbows: "ELBOWS.png",
  hands: "HANDS.png",
  knees: "KNEES.png",
  feet: "FEET.png",
};

export function BodyPartAnswerPicture({ part, className = "" }: { part: BodyPartId; className?: string }) {
  return (
    <div className={`body-part-answer-picture flex shrink-0 items-center justify-center ${className}`}>
      <img
        src={`/body-parts/${BODY_PART_IMAGES[part]}`}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
    </div>
  );
}
