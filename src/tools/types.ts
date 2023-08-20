export interface Tool {
  handleUp: (x: number, y: number) => void;
  handleDown: (x: number, y: number) => void;
  handleMove: (dx: number, dy: number) => void;
}
