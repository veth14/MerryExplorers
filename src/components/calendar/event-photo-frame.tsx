type EventPhotoFrameProps = {
  src: string;
  alt: string;
  onAspectRatioChange?: (ratio: number) => void;
};

/** Shows the complete uploaded photo over a softly blurred fill of the same image. */
export function EventPhotoFrame({ src, alt, onAspectRatioChange }: EventPhotoFrameProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#eaf2fc]">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-60"
      />
      <div className="absolute inset-0 bg-white/15" />
      <img
        src={src}
        alt={alt}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalHeight > 0) onAspectRatioChange?.(naturalWidth / naturalHeight);
        }}
        className="absolute inset-0 h-full w-full object-contain p-1.5"
      />
    </div>
  );
}
