# P-NATIVE Flutter 네이티브 합성

현행: `ddiroriTheme()` 아래 Material 위젯과 공통 패키지를 합성한다. 이 문서의 이름으로 DdiroriCheckbox/Select/Table 등의 새 클래스가 존재하는 것은 아니다. wrapper를 추가하려면 반복 의미·상태 계약과 실제 두 소비 지점을 확인한다.

Import는 `package:flutter/material.dart`와 `package:ddirori_ui/ddirori_ui.dart`. 아래 `value`와 callback은 host가 소유한다. 실제 최소 식의 타입은 [예제 파일](examples-flutter.dart)과 API 부록으로 확인한다.

| 역할 | 필수 합성 / 상태 / 사건 | semantics·크기 |
| --- | --- | --- |
| Field/Textarea | DdiroriInput(label,value,onChanged,maxLines:3,error,help,required) | required는 표기만. 검증은 host, TextField 내부 controller 소유 |
| Checkbox | CheckboxListTile(title,value,onChanged,tristate:true)에서 null=mixed | 선택 집합 변환 host, null callback 비활성, 독립 label |
| Radio | RadioGroup<T>(groupValue,onChanged,child) + RadioListTile<T>(value,title,enabled) | native focus·single selection, 값 중복 금지 |
| Switch | SwitchListTile(title,value,onChanged) | 즉시 적용, 실패 rollback host |
| Select | InputDecorator(labelText,errorText) → DropdownButtonHideUnderline → DropdownButton<T>(isExpanded,value,items,onChanged) | item value 유일; 값 없으면 value:null/hint. 비활성 onChanged:null. 외부 label semantics 확인 |
| Slider | Semantics(label) → Slider(value,min,max,divisions,onChanged,onChangeEnd,semanticFormatterCallback) | 범위 유효, 연속 입력과 commit 분리, 단위 읽기 |
| Icon | Icon(size:20,semanticLabel) 또는 ExcludeSemantics(Icon) | 버튼이면 DdiroriIconButton의 label이 이름 소유 |
| Count Badge | Badge(label:Text(countLabel),child:Icon(...)) | 상태 tone은 DdiroriStatusBadge; count 발표는 host |
| Divider | Divider(thickness:1) | color는 Theme.dividerTheme, height는 레이아웃 여백 |
| Card | Card(child:...) 또는 DdiroriSection | Theme의 surface/tint/shape 유지, 기본적으로 flat 목록 우선 |
| Table | DataTable(columns,rows,sortColumnIndex,sortAscending) + 가로 SingleChildScrollView | header sort만 제어, 실제 sort host; empty 안내를 밖에 유지 |
| Tooltip | Tooltip(message,child:focusableControl) | long press/focus/hover는 native; 필수 label 별도 |
| Navigation | NavigationBar(selectedIndex,onDestinationSelected,destinations) / NavigationRail | 선택 index→route host, 뒤로 가기/URL은 앱 |
| Group | Semantics(container:true,label) + Wrap 또는 FocusTraversalGroup | 범용 group 자체에 실행·선택 의미 없음 |
| Density | Theme(data:Theme.of(context).copyWith(extensions:...DdiroriStyle.copyWith(density,touch)),child) | 다른 extensions 보존. 루트 light ThemeData 새로 생성 금지 |

## 유효하지 않은 Dropdown 값

목표 adapter recipe. 모델에서 선택값이 제거될 수 있으므로 native assertion을 피한다. 빈 옵션이면 hint와 null callback을 제공한다. 자동으로 첫 값을 저장하지 않는다.

```dart
final valid = options.any((o) => o.value == selected);
InputDecorator(
  decoration: InputDecoration(
    labelText: '정렬',
    errorText: valid ? null : '선택할 항목을 확인해 주세요',
  ),
  child: DropdownButtonHideUnderline(
    child: DropdownButton<String>(
      isExpanded: true,
      value: valid ? selected : null,
      hint: const Text('선택하세요'),
      items: options,
      onChanged: options.isEmpty ? null : (next) {
        if (next != null) onSelected(next);
      },
    ),
  ),
);
```

위 `options`는 `List<DropdownMenuItem<String>>`, `selected`는 String?, `onSelected`는 ValueChanged<String>이다. required 폼 제출이 필요하면 host validation 또는 별도 FormField recipe를 선택한다. 이것을 현재 공통 Dropdown의 자동검증 기능으로 쓰지 않는다.

## 확인과 비동기 작업

```dart
final confirmed = await showDdiroriConfirmDialog(
  context: context, title: '자료 삭제', message: '선택한 자료를 삭제할까요?',
  confirmLabel: '삭제', danger: true,
);
if (!confirmed || !context.mounted) return;
await deleteSelection(); // host가 busy/error/실패 시 복구를 관리
```

닫히지 않는 비동기 폼이 필요하면 bool helper가 아니라 앱 상태를 유지하는 showDdiroriDialog body를 사용한다. barrier/Back 차단 정책은 별도 adapter와 테스트가 필요하다. 결과 Future가 반환되는 것과 도메인 작업 완료를 동일시하지 않는다.
