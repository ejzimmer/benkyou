import { describe, it, expect } from 'vitest'
import { createSubtreeDataShape, PLAIN_DATA_SHAPE } from './dataShape';

describe('createSubtreeDataShape', () => {
  const amimonoShape = createSubtreeDataShape('amimono');

  describe('finding where an app path is stored', () => {
    it('puts the path under the subtree in v2', () => {
      expect(amimonoShape.findStoredPath('projects/abc')).toBe(
        'v2/amimono/projects/abc',
      );
    });
  });

  describe('converting updates', () => {
    it('moves every path under the subtree in v2', () => {
      expect(
        amimonoShape.convertUpdates({ 'projects/abc/name': 'Hat' }, () => null),
      ).toEqual({ 'v2/amimono/projects/abc/name': 'Hat' });
    });

    it('turns a removal into a null write', () => {
      expect(
        amimonoShape.convertUpdates({ 'projects/abc': undefined }, () => null),
      ).toEqual({ 'v2/amimono/projects/abc': null });
    });
  });

  describe('reading a stored value', () => {
    it('returns it unchanged', () => {
      const project = { name: 'Hat' };

      expect(amimonoShape.convertStoredValue('projects/abc', project)).toBe(
        project,
      );
    });
  });
});

describe('PLAIN_DATA_SHAPE', () => {
  it('stores app paths directly under v2', () => {
    expect(PLAIN_DATA_SHAPE.findStoredPath('projects/abc')).toBe(
      'v2/projects/abc',
    );
  });
});
