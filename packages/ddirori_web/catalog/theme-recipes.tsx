// Service-owned composition examples. Intentionally not exported from @ddirori/ui.
import { Button, IconButton, Input, Item, Text } from '../src';
import { Choices } from '../src';
import { Stack } from '../src/basic';
import { FileMusic, Bookmark } from 'lucide-react';
import './theme-recipes.css';

export function ExcerptRowExample({ title, detail, saved, disabled = false, onOpen, onSave }: {
  title: string; detail: string; saved: boolean; disabled?: boolean;
  onOpen: () => void; onSave: () => void;
}) {
  return <div className="theme-excerpt">
    <Item flat title={title} subtitle={detail} disabled={disabled} onOpen={onOpen}
      leading={<FileMusic size={24} strokeWidth={1.75} aria-hidden="true" />}
      trailing={<IconButton label={`${title} 저장`} selected={saved} disabled={disabled} onClick={onSave}>
        <Bookmark size={20} strokeWidth={1.75} aria-hidden="true" />
      </IconButton>} />
  </div>;
}

export function PropertyGroupExample({ title, value, error, mode, onValue, onMode, onApply }: {
  title: string; value: string; error?: string; mode: string[];
  onValue: (value: string) => void; onMode: (value: string[]) => void; onApply: () => void;
}) {
  return <section className="theme-properties" aria-label={title}>
    <Text as="h3" variant="itemTitle">{title}</Text>
    <Text as="p" variant="description" className="theme-muted">문서의 이름과 표시 방식을 설정해요.</Text>
    <Stack gap="lg">
      <Input label="이름" value={value} error={error} onChange={e => onValue(e.target.value)} />
      <div className="theme-field-group">
        <Text as="p" variant="label">표시</Text>
        <Choices label="표시할 항목" options={[{ value: 'part', label: '파트 이름' }, { value: 'bar', label: '마디 번호' }]}
          selected={mode} onChange={onMode} multiple />
      </div>
      <div className="theme-actions"><Button onClick={onApply}>적용</Button></div>
    </Stack>
  </section>;
}
