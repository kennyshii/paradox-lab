// Pure functions only (no DOM), so they can be unit-tested with `node --test`.

export const valueAt = (n) => n * n;

export const curve = (max) => Array.from({ length: max }, (_, i) => [i + 1, valueAt(i + 1)]);
