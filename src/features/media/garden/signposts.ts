const WIDE_CHARACTER =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}＀-￯]/u;
const LONG_NAME_WIDTH = 12;

const measureNameWidth = (name: string) =>
  [...name].reduce(
    (width, character) => width + (WIDE_CHARACTER.test(character) ? 2 : 1),
    0,
  );

export const countSignposts = (name: string) =>
  measureNameWidth(name) > LONG_NAME_WIDTH ? 2 : 1;
