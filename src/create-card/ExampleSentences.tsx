import { useCallback, useMemo } from "react"

type Props = {
  value: string[]
  onChange: (sentences: string[]) => void
}

export function ExampleSentences({ value, onChange }: Props) {
  const sentences = useMemo(() => (value.length > 0 ? value : [""]), [value])

  const addSentence = useCallback(() => {
    onChange([...value, ""])
  }, [value, onChange])

  const saveSentence = useCallback(
    (index: number, sentence: string) => {
      value[index] = sentence
      onChange([...value])
    },
    [value, onChange]
  )

  return (
    <fieldset className="example-sentences jp">
      <legend style={{ display: "contents" }}>使用例</legend>
      <button type="button" aria-label="Add new sentence" onClick={addSentence}>
        +
      </button>
      {sentences.map((sentence, index) => (
        <input
          key={index}
          value={sentence}
          onChange={(event) => saveSentence(index, event.target.value)}
          style={{ gridColumn: "1/-1 ", marginBottom: "12px" }}
        />
      ))}
    </fieldset>
  )
}
