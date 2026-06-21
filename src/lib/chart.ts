export function buildPath(points: Array<{ value: number }>) {
  const width = 360;
  const height = 220;
  const max = 50;
  const min = 0;
  const xStep = width / Math.max(points.length - 1, 1);

  const coords = points.map((point, index) => ({
    x: index * xStep,
    y: height - ((point.value - min) / (max - min)) * height,
  }));

  if (coords.length === 0) return "";
  if (coords.length === 1) return `M${coords[0].x},${coords[0].y}`;

  let path = `M${coords[0].x},${coords[0].y}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const current = coords[i];
    const next = coords[i + 1];
    
    // Horizontal tangents to ensure monotonicity and prevent overshoot
    const controlPointX = current.x + (next.x - current.x) / 2;
    path += ` C${controlPointX},${current.y} ${controlPointX},${next.y} ${next.x},${next.y}`;
  }

  return path;
}
