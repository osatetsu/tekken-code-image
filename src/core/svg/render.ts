export function renderSvg(container: HTMLElement, markup: string): void {
  const documentNode = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = documentNode.documentElement;
  if (documentNode.querySelector("parsererror") || svg.localName !== "svg") {
    throw new Error("Unable to render SVG");
  }

  container.replaceChildren(document.importNode(svg, true));
}
