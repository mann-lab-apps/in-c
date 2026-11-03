import { Select, Text } from '@ddirori/ui'
import './studio-part-setup.css'

interface Field {
  label: string
  value: string
  options: readonly { value: string; label: string; disabled?: boolean }[]
  disabled?: boolean
  help: string
  onChange: (value: string) => void
}

// A preset for the next added part is distinct from edits to existing staves.
export function StudioPartSetup({ fields }: { fields: readonly Field[] }) {
  return <section className="studio-part-setup" aria-label="보표와 악기 설정"
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229 ||
        (!event.metaKey && !event.ctrlKey && !event.altKey &&
          (event.target as HTMLElement).closest('[role="combobox"]'))) event.stopPropagation()
    }}>
    <Text as="h3" variant="itemTitle">보표와 악기 설정</Text>
    <div className="studio-part-setup__fields">{fields.map(field =>
      <div className="studio-part-setup__field" key={field.label} data-field={field.label}>
        <Select {...field}/>
      </div>
    )}</div>
  </section>
}
