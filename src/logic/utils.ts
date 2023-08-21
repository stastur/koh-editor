export function createPoint(x: number, y: number) {
  const buffer = new Uint16Array(2);
  buffer[0] = x;
  buffer[1] = y;

  return buffer;
}
