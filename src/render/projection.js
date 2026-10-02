// Fixed-angle oblique projector. World axes: +x east, +y north, +z up.
// Returns screen [sx, sy, depth] for a world point. The camera never yaws, so
// the trajectory reads as a path inside a 3D box.
export function make3DProjector({
  cx, cy,                    // screen point that (worldCx, worldCy, worldCz) maps to
  worldCx, worldCy, worldCz, // camera target in world units
  scale,                     // px per world unit
  azimuth = -0.55,           // rotation about z (rad)
  elevation = 0.55,          // tilt down from horizontal (rad)
}) {
  const cosA = Math.cos(azimuth), sinA = Math.sin(azimuth);
  const cosE = Math.cos(elevation), sinE = Math.sin(elevation);
  return (wx, wy, wz) => {
    const dx = wx - worldCx;
    const dy = wy - worldCy;
    const dz = wz - worldCz;
    const rx = dx * cosA - dy * sinA;
    const ry = dx * sinA + dy * cosA;
    return [cx + rx * scale, cy - (ry * sinE + dz * cosE) * scale, ry * cosE - dz * sinE];
  };
}
