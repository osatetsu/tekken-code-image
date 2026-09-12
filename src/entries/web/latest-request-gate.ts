export type LatestRequestGate = {
  next(): number;
  isCurrent(requestId: number): boolean;
};

export function createLatestRequestGate(): LatestRequestGate {
  let current = 0;
  return {
    next(): number {
      current += 1;
      return current;
    },
    isCurrent(requestId: number): boolean {
      return requestId === current;
    },
  };
}
