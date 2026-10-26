# F-REF 토큰 원본 대조표

2026-10-26 블루 통일에 맞춰 해석값 갱신. 정본은 [tokens.json](../tokens.json)과 [color-system.json](../color-system.json)이다. 변경 후 이 표를 다시 추출하고 생성 도구 --check로 검증한다. 역할·사용 예외·플랫폼 단위는 [기초 명세](foundations.md)에 있다.

| 경로 | 선언값 | 해석값 | 단위/해석 |
| --- | --- | --- | --- |
| `schemaVersion` | `"1.1"` | `"1.1"` | 역할/문자열 |
| `brandInput` | `"palette-pilot.json"` | `"palette-pilot.json"` | 역할/문자열 |
| `themes.light.background` | `"@light.background"` | `"#FFFFFF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.surface` | `"@light.surface"` | `"#FFFFFF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.surfaceMuted` | `"@light.surfaceMuted"` | `"#F5F5F5"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.text` | `"@light.ink"` | `"#202020"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.muted` | `"@light.muted"` | `"#616161"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.action` | `"@light.primary"` | `"#1971C2"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.actionHover` | `"@light.primaryHover"` | `"#1864AB"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.actionPressed` | `"@light.primaryPressed"` | `"#155592"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.onAction` | `"@light.onPrimary"` | `"#FFFFFF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.sky` | `"@light.sky"` | `"#A8D4E5"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.peach` | `"@light.peach"` | `"#F3BB9B"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.onPastel` | `"@light.ink"` | `"#202020"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.border` | `"@light.border"` | `"#E5E5E5"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.controlBorder` | `"@light.controlBorder"` | `"#808080"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.focus` | `"@light.primary"` | `"#1971C2"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.success` | `"@light.success"` | `"#246145"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.warning` | `"@light.warning"` | `"#805500"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.error` | `"@light.error"` | `"#AF344B"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.disabled` | `"#E5E5E5"` | `"#E5E5E5"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.onDisabled` | `"#616161"` | `"#616161"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.overlay` | `"#202020"` | `"#202020"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.onOverlay` | `"#FFFFFF"` | `"#FFFFFF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.brand` | `"@brand.primary"` | `"#A5D8FF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.onBrand` | `"@brand.onPrimary"` | `"#202020"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.selection` | `"@light.tint"` | `"#E7F5FF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.onSelection` | `"@light.ink"` | `"#202020"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.info` | `"@light.muted"` | `"#616161"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.interactionHover` | `"@light.surfaceMuted"` | `"#F5F5F5"` | 색 HEX → CSS color / Dart ARGB |
| `themes.light.interactionPressed` | `"#E5E5E5"` | `"#E5E5E5"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.background` | `"@darkProposal.background"` | `"#181818"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.surface` | `"@darkProposal.surface"` | `"#222222"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.surfaceMuted` | `"@darkProposal.surfaceMuted"` | `"#2C2C2C"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.text` | `"@darkProposal.ink"` | `"#F5F5F5"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.muted` | `"@darkProposal.muted"` | `"#B8B8B8"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.action` | `"@darkProposal.primary"` | `"#A5D8FF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.actionHover` | `"@darkProposal.primaryHover"` | `"#D0EBFF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.actionPressed` | `"@darkProposal.primaryPressed"` | `"#E7F5FF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.onAction` | `"@darkProposal.onPrimary"` | `"#202020"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.sky` | `"@darkProposal.sky"` | `"#A8D4E5"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.peach` | `"@darkProposal.peach"` | `"#F3BB9B"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.onPastel` | `"@light.ink"` | `"#202020"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.border` | `"@darkProposal.border"` | `"#424242"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.controlBorder` | `"@darkProposal.controlBorder"` | `"#888888"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.focus` | `"@darkProposal.primary"` | `"#A5D8FF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.success` | `"#7DD8AD"` | `"#7DD8AD"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.warning` | `"#F1CD88"` | `"#F1CD88"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.error` | `"#FFADB6"` | `"#FFADB6"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.disabled` | `"#383838"` | `"#383838"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.onDisabled` | `"#B8B8B8"` | `"#B8B8B8"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.overlay` | `"#202020"` | `"#202020"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.onOverlay` | `"#FFFFFF"` | `"#FFFFFF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.brand` | `"@brand.primary"` | `"#A5D8FF"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.onBrand` | `"@brand.onPrimary"` | `"#202020"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.selection` | `"@darkProposal.tint"` | `"#233344"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.onSelection` | `"@darkProposal.ink"` | `"#F5F5F5"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.info` | `"@darkProposal.muted"` | `"#B8B8B8"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.interactionHover` | `"@darkProposal.surfaceMuted"` | `"#2C2C2C"` | 색 HEX → CSS color / Dart ARGB |
| `themes.dark.interactionPressed` | `"#383838"` | `"#383838"` | 색 HEX → CSS color / Dart ARGB |
| `score.paper` | `"@scorePaper.background"` | `"#FFFFFF"` | 색 HEX → CSS color / Dart ARGB |
| `score.notation` | `"@scorePaper.notation"` | `"#202020"` | 색 HEX → CSS color / Dart ARGB |
| `score.annotationInk` | `"#111111"` | `"#111111"` | 색 HEX → CSS color / Dart ARGB |
| `score.annotationRed` | `"#D33232"` | `"#D33232"` | 색 HEX → CSS color / Dart ARGB |
| `score.annotationBlue` | `"#1D5FD1"` | `"#1D5FD1"` | 색 HEX → CSS color / Dart ARGB |
| `score.annotationYellow` | `"#FFCC25"` | `"#FFCC25"` | 색 HEX → CSS color / Dart ARGB |
| `score.voiceOne` | `"#1D5FD1"` | `"#1D5FD1"` | 색 HEX → CSS color / Dart ARGB |
| `score.voiceTwo` | `"#9358B7"` | `"#9358B7"` | 색 HEX → CSS color / Dart ARGB |
| `score.playhead` | `"#19734D"` | `"#19734D"` | 색 HEX → CSS color / Dart ARGB |
| `spacing.xs` | `4` | `4` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `spacing.sm` | `8` | `8` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `spacing.md` | `12` | `12` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `spacing.lg` | `16` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `spacing.xl` | `24` | `24` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `spacing.xxl` | `32` | `32` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `radius.control` | `10` | `10` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `radius.card` | `12` | `12` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `radius.panel` | `16` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `radius.pill` | `999` | `999` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `density.comfortable.control` | `48` | `48` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `density.comfortable.gap` | `12` | `12` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `density.comfortable.font` | `16` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `density.compact.control` | `32` | `32` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `density.compact.gap` | `8` | `8` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `density.compact.font` | `14` | `14` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `typography.body` | `16` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `typography.label` | `14` | `14` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `typography.title` | `24` | `24` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `typography.display` | `32` | `32` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `typography.lineHeight` | `1.5` | `1.5` | 무단위 배수 |
| `typography.webFamily` | `"\"Ddirori Pretendard\", system-ui, sans-serif"` | `"\"Ddirori Pretendard\", system-ui, sans-serif"` | 역할/문자열 |
| `typography.flutterFamily` | `"platform default; optional licensed TTF/OTF supplied by consumer"` | `"platform default; optional licensed TTF/OTF supplied by consumer"` | 역할/문자열 |
| `typography.caption` | `12` | `12` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `typography.section` | `20` | `20` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `typography.headingLineHeight` | `1.3` | `1.3` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `typography.controlLineHeight` | `1.4` | `1.4` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `typography.bodyWeight` | `400` | `400` | font weight |
| `typography.labelWeight` | `500` | `500` | font weight |
| `typography.actionWeight` | `600` | `600` | font weight |
| `typography.headingWeight` | `700` | `700` | font weight |
| `typography.headingTracking` | `-0.02` | `-0.02` | em → Flutter size×tracking |
| `motion.feedbackMs` | `120` | `120` | ms |
| `motion.panelMs` | `180` | `180` | ms |
| `motion.loaderCycleMs` | `1200` | `1200` | ms |
| `contentInput` | `"color-system.json"` | `"color-system.json"` | 역할/문자열 |
| `control.choiceHeight` | `36` | `36` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.choiceCompactHeight` | `32` | `32` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.choicePaddingX` | `"$spacing.md"` | `12` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.choicePaddingY` | `7` | `7` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.choiceCompactPaddingY` | `5` | `5` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.choiceGap` | `6` | `6` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.choiceIcon` | `14` | `14` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.buttonPaddingX` | `"$spacing.lg"` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.buttonPaddingY` | `10` | `10` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.fieldGap` | `6` | `6` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.focusWidth` | `2` | `2` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.focusOffset` | `2` | `2` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.borderWidth` | `1` | `1` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.toolRadius` | `8` | `8` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.touchTarget` | `48` | `48` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.fieldPadding` | `14` | `14` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `control.iconPadding` | `"$spacing.sm"` | `8` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.pageGutter` | `"$spacing.lg"` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.pageGutterWide` | `"$spacing.xxl"` | `32` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.sectionGap` | `"$spacing.xl"` | `24` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.sectionGapWide` | `"$spacing.xxl"` | `32` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.rowPadding` | `"$spacing.lg"` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.itemGap` | `"$spacing.md"` | `12` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.labelGap` | `6` | `6` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.panelWidth` | `280` | `280` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.panelMin` | `240` | `240` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.dialogWidth` | `560` | `560` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.sheetWidth` | `720` | `720` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.contentMax` | `1120` | `1120` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layout.dialogPadding` | `"$spacing.xl"` | `24` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `breakpoints.medium` | `600` | `600` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `breakpoints.wide` | `960` | `960` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `breakpoints.workspace` | `1280` | `1280` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `layer.base` | `0` | `0` | 곡선/순서/플랫폼 elevation (CSS px 아님) |
| `layer.sticky` | `10` | `10` | 곡선/순서/플랫폼 elevation (CSS px 아님) |
| `layer.popover` | `20` | `20` | 곡선/순서/플랫폼 elevation (CSS px 아님) |
| `layer.modal` | `30` | `30` | 곡선/순서/플랫폼 elevation (CSS px 아님) |
| `layer.notice` | `40` | `40` | 곡선/순서/플랫폼 elevation (CSS px 아님) |
| `layer.tooltip` | `50` | `50` | 곡선/순서/플랫폼 elevation (CSS px 아님) |
| `elevation.flat` | `0` | `0` | 곡선/순서/플랫폼 elevation (CSS px 아님) |
| `elevation.floating` | `4` | `4` | 곡선/순서/플랫폼 elevation (CSS px 아님) |
| `elevation.modal` | `8` | `8` | 곡선/순서/플랫폼 elevation (CSS px 아님) |
| `icon.small` | `16` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `icon.tool` | `18` | `18` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `icon.default` | `20` | `20` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `icon.large` | `24` | `24` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `icon.stroke` | `1.75` | `1.75` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `easing.standard` | `[0.2, 0, 0, 1]` | `[0.2,0,0,1]` | 곡선/순서/플랫폼 elevation (CSS px 아님) |
| `easing.exit` | `[0.4, 0, 1, 1]` | `[0.4,0,1,1]` | 곡선/순서/플랫폼 elevation (CSS px 아님) |
| `textStyles.screenTitle.size` | `"$typography.title"` | `24` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `textStyles.screenTitle.weight` | `"$typography.headingWeight"` | `700` | font weight |
| `textStyles.screenTitle.lineHeight` | `"$typography.headingLineHeight"` | `1.3` | 무단위 배수 |
| `textStyles.screenTitle.tracking` | `"$typography.headingTracking"` | `-0.02` | em → Flutter size×tracking |
| `textStyles.sectionTitle.size` | `"$typography.section"` | `20` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `textStyles.sectionTitle.weight` | `"$typography.actionWeight"` | `600` | font weight |
| `textStyles.sectionTitle.lineHeight` | `"$typography.headingLineHeight"` | `1.3` | 무단위 배수 |
| `textStyles.sectionTitle.tracking` | `"$typography.headingTracking"` | `-0.02` | em → Flutter size×tracking |
| `textStyles.itemTitle.size` | `"$typography.body"` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `textStyles.itemTitle.weight` | `"$typography.actionWeight"` | `600` | font weight |
| `textStyles.itemTitle.lineHeight` | `"$typography.headingLineHeight"` | `1.3` | 무단위 배수 |
| `textStyles.itemTitle.tracking` | `0` | `0` | em → Flutter size×tracking |
| `textStyles.body.size` | `"$typography.body"` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `textStyles.body.weight` | `"$typography.bodyWeight"` | `400` | font weight |
| `textStyles.body.lineHeight` | `"$typography.lineHeight"` | `1.5` | 무단위 배수 |
| `textStyles.body.tracking` | `0` | `0` | em → Flutter size×tracking |
| `textStyles.description.size` | `"$typography.label"` | `14` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `textStyles.description.weight` | `"$typography.bodyWeight"` | `400` | font weight |
| `textStyles.description.lineHeight` | `"$typography.lineHeight"` | `1.5` | 무단위 배수 |
| `textStyles.description.tracking` | `0` | `0` | em → Flutter size×tracking |
| `textStyles.label.size` | `"$typography.label"` | `14` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `textStyles.label.weight` | `"$typography.labelWeight"` | `500` | font weight |
| `textStyles.label.lineHeight` | `"$typography.controlLineHeight"` | `1.4` | 무단위 배수 |
| `textStyles.label.tracking` | `0` | `0` | em → Flutter size×tracking |
| `textStyles.action.size` | `"$typography.body"` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `textStyles.action.weight` | `"$typography.actionWeight"` | `600` | font weight |
| `textStyles.action.lineHeight` | `"$typography.controlLineHeight"` | `1.4` | 무단위 배수 |
| `textStyles.action.tracking` | `0` | `0` | em → Flutter size×tracking |
| `textStyles.caption.size` | `"$typography.caption"` | `12` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `textStyles.caption.weight` | `"$typography.labelWeight"` | `500` | font weight |
| `textStyles.caption.lineHeight` | `"$typography.controlLineHeight"` | `1.4` | 무단위 배수 |
| `textStyles.caption.tracking` | `0` | `0` | em → Flutter size×tracking |
| `textStyles.display.size` | `"$typography.display"` | `32` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `textStyles.display.weight` | `"$typography.headingWeight"` | `700` | font weight |
| `textStyles.display.lineHeight` | `"$typography.headingLineHeight"` | `1.3` | 무단위 배수 |
| `textStyles.display.tracking` | `"$typography.headingTracking"` | `-0.02` | em → Flutter size×tracking |
| `textStyles.numeric.size` | `"$typography.body"` | `16` | 기준 px/logical pixel; 글자 크기는 웹 rem |
| `textStyles.numeric.weight` | `"$typography.labelWeight"` | `500` | font weight |
| `textStyles.numeric.lineHeight` | `"$typography.controlLineHeight"` | `1.4` | 무단위 배수 |
| `textStyles.numeric.tracking` | `0` | `0` | em → Flutter size×tracking |
