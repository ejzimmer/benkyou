export class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  private readonly observed = new Set<Element>();

  constructor(private readonly onResize: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.add(element);
  }

  unobserve(element: Element) {
    this.observed.delete(element);
  }

  disconnect() {
    this.observed.clear();
  }

  reportResize(element: Element) {
    if (this.observed.has(element)) {
      this.onResize([], this);
    }
  }
}

export function resizeElement(element: Element) {
  FakeResizeObserver.instances.forEach((observer) =>
    observer.reportResize(element),
  );
}
