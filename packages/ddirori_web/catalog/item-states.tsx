import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FileMusic, Info, Play} from 'lucide-react';
import {Button, IconButton, Item, List, Stack, Text} from '../src';
import '../src/styles.css';

const title = '평균율클라비어곡집제1권전주곡과푸가다장조BWV846';
function ItemStates() {
  const [selected, setSelected] = useState(false);
  const [event, setEvent] = useState('대기');
  const params = new URLSearchParams(location.search);
  return <main className="ddirori" data-theme={params.get('theme') === 'dark' ? 'dark' : 'light'}
    data-density={params.get('density') === 'compact' ? 'compact' : 'comfortable'}
    style={{minHeight:'100vh', padding:16}}>
    <Stack>
      <Text as="h1" variant="screenTitle">공통 목록 행</Text>
      <List label="악보">
        <Item flat title={title} subtitle="J. S. Bach · 악보 6쪽" selecting selected={selected}
          onSelected={setSelected} onOpen={() => setEvent('악보 열기')}
          trailing={<IconButton label="악보 정보" onClick={() => setEvent('악보 정보')}><Info size={20}/></IconButton>}/>
      </List>
      <List label="녹음">
        <Item flat title="골드베르크 변주곡 · 피아노 녹음" subtitle="아리아 · 4분 32초"
          leading={<FileMusic size={24} aria-hidden="true"/>} onOpen={() => setEvent('녹음 열기')}
          trailing={<IconButton label="녹음 재생" onClick={() => setEvent('녹음 재생')}><Play size={20}/></IconButton>}
          actions={<Button kind="quiet" onClick={() => setEvent('녹음 정보')}>녹음 정보</Button>}/>
        <Item flat disabled title="사용할 수 없는 녹음" subtitle="파일 연결 필요"
          onOpen={() => setEvent('잘못된 열기')}
          trailing={<IconButton label="비활성 재생" onClick={() => setEvent('잘못된 재생')}><Play size={20}/></IconButton>}/>
      </List>
      <Item title="기존 기본 카드" subtitle="기존 호출 계약 유지"/>
      <output aria-label="최근 동작">{event}</output>
    </Stack>
  </main>;
}
createRoot(document.getElementById('root')!).render(<ItemStates/>);
