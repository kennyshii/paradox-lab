// Geometry of the missing square puzzle (13 × 5 "triangle"). Grid units, y pointing up.

export const WIDTH = 13;
export const HEIGHT = 5;

/**
 * The four pieces in arrangement A, plus the translation that moves each one into arrangement B.
 * No piece is rotated: both figures use exactly the same shapes.
 */
export const PIECES = [
  { id: "red", label: "A", name: "large triangle (8 × 3)", points: [[0, 0], [8, 0], [8, 3]], labelAt: [5.6, 1], shift: [5, 2] },
  { id: "blue", label: "B", name: "small triangle (5 × 2)", points: [[8, 3], [13, 3], [13, 5]], labelAt: [11.6, 3.6], shift: [-8, -3] },
  { id: "green", label: "C", name: "8-square L shape", points: [[8, 0], [13, 0], [13, 1], [11, 1], [11, 2], [8, 2]], labelAt: [9.5, 0.9], shift: [-3, 0] },
  { id: "orange", label: "D", name: "7-square L shape", points: [[11, 1], [13, 1], [13, 3], [8, 3], [8, 2], [11, 2]], labelAt: [10.5, 2.5], shift: [0, -1] },
];

/** The empty unit square in arrangement B. */
export const HOLE = [[10, 0], [11, 0], [11, 1], [10, 1]];

/** Shoelace formula. */
export function area(points) {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export const slope = ([[x1, y1], [x2, y2]]) => (y2 - y1) / (x2 - x1);

/** Position of a piece at animation progress t (0 = arrangement A, 1 = arrangement B). */
export const placed = (piece, t) => piece.points.map(([x, y]) => [x + piece.shift[0] * t, y + piece.shift[1] * t]);

/** The thin sliver between the true diagonal and each figure's bent "hypotenuse". */
export const SLIVERS = {
  A: [[0, 0], [8, 3], [13, 5]], // bends inward (concave): this figure is missing half a square
  B: [[0, 0], [5, 2], [13, 5]], // bends outward (convex): this figure has an extra half square
};
