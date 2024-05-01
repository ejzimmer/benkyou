export function CreateCard() {
  return (
    <form>
      <label htmlFor="japanese">日本語</label>
      <input id="japanese" />
      <button>ふりがなを付け足す</button>

      <label htmlFor="english">日本語</label>
      <input id="english" />

      <label htmlFor="example">使用例</label>
      <input id="example" />
      <button>付け加える</button>
    </form>
  )
}
