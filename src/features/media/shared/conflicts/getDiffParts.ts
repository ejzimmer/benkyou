type DiffPart = { text: string; kind: 'same' | 'removed' | 'added' };

export function getDiffParts(original: string, changed: string): DiffPart[] {
  const originalWords = original.split(/(\s+)/);
  const changedWords = changed.split(/(\s+)/);
  let start = 0;
  while (
    start < originalWords.length &&
    start < changedWords.length &&
    originalWords[start] === changedWords[start]
  ) {
    start++;
  }
  let end = 0;
  while (
    end < originalWords.length - start &&
    end < changedWords.length - start &&
    originalWords[originalWords.length - 1 - end] ===
      changedWords[changedWords.length - 1 - end]
  ) {
    end++;
  }
  const removed = originalWords
    .slice(start, originalWords.length - end)
    .join('');
  const added = changedWords.slice(start, changedWords.length - end).join('');
  const changedText = removed || added;
  const leadingSpace = changedText.match(/^\s*/)?.[0] ?? '';
  const trailingSpace = changedText.match(/\s*$/)?.[0] ?? '';
  const parts: DiffPart[] = [
    {
      text: originalWords.slice(0, start).join('') + leadingSpace,
      kind: 'same',
    },
    { text: removed.trim(), kind: 'removed' },
    { text: removed.trim() && added.trim() ? ' ' : '', kind: 'same' },
    { text: added.trim(), kind: 'added' },
    {
      text:
        trailingSpace +
        originalWords.slice(originalWords.length - end).join(''),
      kind: 'same',
    },
  ];
  return parts.filter(({ text }) => text !== '');
}
