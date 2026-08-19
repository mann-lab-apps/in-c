import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct StoreSpec {
    let output: String
    let title: String
    let subtitle: String
    let tone: String
    let frequency: String
    let reference: String
    let color: ToneColor
    let drone: Bool
    let selectedPitch: String
    let showSettings: Bool
}

enum ToneColor {
    case pure
    case warm
    case bright

    var label: String {
        switch self {
        case .pure: "Pure"
        case .warm: "Warm"
        case .bright: "Bright"
        }
    }

    var tint: UInt32 {
        switch self {
        case .pure: 0xff85cbff
        case .warm: 0xff5fb48a
        case .bright: 0xffc39636
        }
    }
}

struct StoreVariant {
    let folder: String
    let width: Int
    let height: Int
    let titleSize: CGFloat
    let subtitleSize: CGFloat
    let appX: CGFloat
    let appY: CGFloat
    let appWidth: CGFloat
    let appHeight: CGFloat
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)

let specs: [StoreSpec] = [
    .init(
        output: "chime-01-main.jpg",
        title: "기준음을 바로 확인",
        subtitle: "C부터 B까지 필요한 음을 빠르게 고릅니다.",
        tone: "A4",
        frequency: "440.0 Hz",
        reference: "A=440",
        color: .warm,
        drone: false,
        selectedPitch: "A",
        showSettings: false
    ),
    .init(
        output: "chime-02-drone.jpg",
        title: "짧게 울리고 길게 듣기",
        subtitle: "Chime과 Drone으로 음정을 귀로 맞춥니다.",
        tone: "C4",
        frequency: "262.8 Hz",
        reference: "A=442",
        color: .bright,
        drone: true,
        selectedPitch: "C",
        showSettings: false
    ),
    .init(
        output: "chime-03-settings.jpg",
        title: "A 기준과 음색 설정",
        subtitle: "440, 441, 442 Hz와 세 가지 음색을 선택합니다.",
        tone: "F#/Gb3",
        frequency: "185.2 Hz",
        reference: "A=441",
        color: .warm,
        drone: false,
        selectedPitch: "F#/Gb",
        showSettings: true
    ),
]

let variants: [StoreVariant] = [
    .init(
        folder: "iphone-6.5",
        width: 1284,
        height: 2778,
        titleSize: 78,
        subtitleSize: 38,
        appX: 92,
        appY: 386,
        appWidth: 1106,
        appHeight: 2140
    ),
    .init(
        folder: "ipad-13",
        width: 2064,
        height: 2752,
        titleSize: 92,
        subtitleSize: 42,
        appX: 150,
        appY: 410,
        appWidth: 1764,
        appHeight: 2028
    ),
]

for variant in variants {
    let outDir = root.appendingPathComponent("store-assets/ios/screenshots/app-store/\(variant.folder)")
    try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

    for (index, spec) in specs.enumerated() {
        let output = "\(variant.folder)-\(spec.output)"
        let outputURL = outDir.appendingPathComponent(output)
        try renderStoreScreenshot(spec: spec, variant: variant, number: index + 1, outputURL: outputURL)
        print(outputURL.path)
    }
}

func renderStoreScreenshot(spec: StoreSpec, variant: StoreVariant, number: Int, outputURL: URL) throws {
    let width = CGFloat(variant.width)
    let height = CGFloat(variant.height)

    guard let context = CGContext(
        data: nil,
        width: variant.width,
        height: variant.height,
        bitsPerComponent: 8,
        bytesPerRow: variant.width * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        throw ScreenshotError.contextCreationFailed
    }

    context.setFillColor(rgb(0xfffffefa))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    drawPaperLines(context, width: width, height: height)

    let margin = variant.folder.hasPrefix("ipad") ? 126.0 : 92.0
    drawText(
        context,
        text: spec.title,
        fontName: "AppleSDGothicNeo-Bold",
        size: variant.titleSize,
        topLeft: CGPoint(x: margin, y: variant.folder.hasPrefix("ipad") ? 116 : 116),
        color: rgb(0xff282724),
        canvasHeight: height
    )
    drawText(
        context,
        text: spec.subtitle,
        fontName: "AppleSDGothicNeo-SemiBold",
        size: variant.subtitleSize,
        topLeft: CGPoint(x: margin + 4, y: variant.folder.hasPrefix("ipad") ? 238 : 224),
        color: rgb(0xff66615a),
        canvasHeight: height
    )

    let appRect = rectFromTopLeft(
        x: variant.appX,
        y: variant.appY,
        width: variant.appWidth,
        height: variant.appHeight,
        canvasHeight: height
    )
    drawFrame(context, rect: appRect.insetBy(dx: -18, dy: -18), radius: 42)

    context.saveGState()
    context.addPath(roundedRectPath(rect: appRect, radius: 30))
    context.clip()
    drawAppSurface(context, rect: appRect, spec: spec)
    context.restoreGState()

    drawText(
        context,
        text: "in C - Chime",
        fontName: "HelveticaNeue-Bold",
        size: variant.folder.hasPrefix("ipad") ? 52 : 42,
        topLeft: CGPoint(x: margin, y: height - (variant.folder.hasPrefix("ipad") ? 164 : 178)),
        color: rgb(0xff282724),
        canvasHeight: height
    )
    drawText(
        context,
        text: "무료 기준음과 드론",
        fontName: "AppleSDGothicNeo-SemiBold",
        size: variant.folder.hasPrefix("ipad") ? 34 : 30,
        topLeft: CGPoint(x: margin + 2, y: height - (variant.folder.hasPrefix("ipad") ? 92 : 116)),
        color: rgb(0xff66615a),
        canvasHeight: height
    )

    guard let image = context.makeImage(),
          let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
        throw ScreenshotError.imageWriteFailed(outputURL.path)
    }

    CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.96] as CFDictionary)
    if !CGImageDestinationFinalize(destination) {
        throw ScreenshotError.imageWriteFailed(outputURL.path)
    }
}

func drawAppSurface(_ context: CGContext, rect: CGRect, spec: StoreSpec) {
    context.saveGState()
    context.setFillColor(rgb(0xfffffefa))
    context.fill(rect)

    let s = rect.width / 1106
    let padding = 42 * s
    let x = rect.minX + padding
    var y = rect.maxY - (58 * s)
    let panelWidth = rect.width - (padding * 2)
    let compact = rect.width < 1300

    drawPanel(
        context,
        rect: CGRect(x: x, y: y - 98 * s, width: panelWidth, height: 98 * s),
        radius: 12 * s
    )
    drawText(context, text: "Chime에 필요한 소리가 있나요?", fontName: "AppleSDGothicNeo-Bold", size: 26 * s, topLeft: CGPoint(x: x + 34 * s, y: rect.maxY - y + 28 * s), color: rgb(0xff242a27), canvasHeight: rect.maxY)
    drawText(context, text: "기능 제안", fontName: "AppleSDGothicNeo-Bold", size: 25 * s, topLeft: CGPoint(x: x + panelWidth - 150 * s, y: rect.maxY - y + 30 * s), color: rgb(0xff2f766e), canvasHeight: rect.maxY)
    y -= 128 * s

    let boardHeight = compact ? 350 * s : 400 * s
    let board = CGRect(x: x, y: y - boardHeight, width: panelWidth, height: boardHeight)
    drawPanel(context, rect: board, radius: 14 * s)
    drawText(context, text: "현재 기준음", fontName: "AppleSDGothicNeo-Bold", size: 28 * s, topLeft: CGPoint(x: board.minX + 34 * s, y: rect.maxY - board.maxY + 36 * s), color: rgb(0xff62635d), canvasHeight: rect.maxY)
    drawText(context, text: spec.tone, fontName: "HelveticaNeue-CondensedBlack", size: (compact ? 138 : 156) * s, topLeft: CGPoint(x: board.minX + 34 * s, y: rect.maxY - board.maxY + 88 * s), color: rgb(0xff202321), canvasHeight: rect.maxY)
    drawText(context, text: "\(spec.frequency) · \(spec.reference) · \(spec.color.label)", fontName: "HelveticaNeue-Bold", size: 28 * s, topLeft: CGPoint(x: board.minX + 36 * s, y: rect.maxY - board.maxY + (compact ? 248 : 284) * s), color: rgb(0xff62635d), canvasHeight: rect.maxY)
    y -= boardHeight + 36 * s

    let buttonHeight = 116 * s
    let buttonWidth = (panelWidth - 28 * s) / 2
    drawActionButton(context, rect: CGRect(x: x, y: y - buttonHeight, width: buttonWidth, height: buttonHeight), fill: 0xffc39636, label: "Chime", icon: "◻")
    drawActionButton(context, rect: CGRect(x: x + buttonWidth + 28 * s, y: y - buttonHeight, width: buttonWidth, height: buttonHeight), fill: spec.drone ? 0xff8e3731 : 0xff2f766e, label: spec.drone ? "Stop" : "Drone", icon: spec.drone ? "■" : "◉")
    y -= buttonHeight + 42 * s

    if spec.showSettings {
        drawSettingsPanel(context, rect: CGRect(x: x, y: y - 880 * s, width: panelWidth, height: 880 * s), spec: spec, scale: s, canvasMaxY: rect.maxY)
    } else {
        drawPitchPanel(context, rect: CGRect(x: x, y: y - 650 * s, width: panelWidth, height: 650 * s), selectedPitch: spec.selectedPitch, scale: s, canvasMaxY: rect.maxY)
        if !compact {
            drawSettingsPanel(context, rect: CGRect(x: x, y: y - 1180 * s, width: panelWidth, height: 470 * s), spec: spec, scale: s, canvasMaxY: rect.maxY)
        }
    }

    context.restoreGState()
}

func drawPitchPanel(_ context: CGContext, rect: CGRect, selectedPitch: String, scale s: CGFloat, canvasMaxY: CGFloat) {
    drawPanel(context, rect: rect, radius: 14 * s)
    drawText(context, text: "음", fontName: "AppleSDGothicNeo-Bold", size: 30 * s, topLeft: CGPoint(x: rect.minX + 34 * s, y: canvasMaxY - rect.maxY + 36 * s), color: rgb(0xff202321), canvasHeight: canvasMaxY)

    let pitches = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"]
    let buttonW = (rect.width - 68 * s - 3 * 22 * s) / 4
    let buttonH = 104 * s
    for (index, pitch) in pitches.enumerated() {
        let row = CGFloat(index / 4)
        let col = CGFloat(index % 4)
        let button = CGRect(
            x: rect.minX + 34 * s + col * (buttonW + 22 * s),
            y: rect.maxY - 128 * s - row * (buttonH + 24 * s) - buttonH,
            width: buttonW,
            height: buttonH
        )
        let selected = pitch == selectedPitch
        drawRoundedFill(context, rect: button, radius: 12 * s, fill: selected ? 0xffe3f2df : 0xffffffff, stroke: selected ? 0xff2f766e : 0xff9a8f86, strokeWidth: 3 * s)
        if selected {
            drawHatch(context, rect: button, color: 0x665fb48a, spacing: 28 * s)
        }
        drawCenteredText(context, text: pitch, fontName: "HelveticaNeue-Bold", size: 25 * s, rect: button, color: selected ? rgb(0xff183e39) : rgb(0xff282724))
    }
}

func drawSettingsPanel(_ context: CGContext, rect: CGRect, spec: StoreSpec, scale s: CGFloat, canvasMaxY: CGFloat) {
    drawPanel(context, rect: rect, radius: 14 * s)
    drawText(context, text: "설정", fontName: "AppleSDGothicNeo-Bold", size: 31 * s, topLeft: CGPoint(x: rect.minX + 34 * s, y: canvasMaxY - rect.maxY + 36 * s), color: rgb(0xff202321), canvasHeight: canvasMaxY)
    drawSettingRow(context, rect: rect, top: 112 * s, label: "옥타브", value: spec.tone.hasSuffix("3") ? "3" : "4", options: ["2", "3", "4", "5"], selected: spec.tone.hasSuffix("3") ? "3" : "4", scale: s, canvasMaxY: canvasMaxY)
    drawSettingRow(context, rect: rect, top: 304 * s, label: "A 기준", value: spec.reference.replacingOccurrences(of: "A=", with: "") + " Hz", options: ["440", "441", "442"], selected: spec.reference.replacingOccurrences(of: "A=", with: ""), scale: s, canvasMaxY: canvasMaxY)
    drawSettingRow(context, rect: rect, top: 496 * s, label: "음색", value: spec.color.label, options: ["Pure", "Warm", "Bright"], selected: spec.color.label, scale: s, canvasMaxY: canvasMaxY)
    drawText(context, text: "볼륨", fontName: "AppleSDGothicNeo-Bold", size: 26 * s, topLeft: CGPoint(x: rect.minX + 34 * s, y: canvasMaxY - rect.maxY + 690 * s), color: rgb(0xff62635d), canvasHeight: canvasMaxY)
    drawVolumeSlider(context, rect: CGRect(x: rect.minX + 34 * s, y: rect.minY + 80 * s, width: rect.width - 68 * s, height: 34 * s), scale: s)
}

func drawSettingRow(_ context: CGContext, rect: CGRect, top: CGFloat, label: String, value: String, options: [String], selected: String, scale s: CGFloat, canvasMaxY: CGFloat) {
    drawText(context, text: label, fontName: "AppleSDGothicNeo-Bold", size: 26 * s, topLeft: CGPoint(x: rect.minX + 34 * s, y: canvasMaxY - rect.maxY + top), color: rgb(0xff62635d), canvasHeight: canvasMaxY)
    drawText(context, text: value, fontName: "HelveticaNeue-Bold", size: 26 * s, topLeft: CGPoint(x: rect.maxX - 170 * s, y: canvasMaxY - rect.maxY + top), color: rgb(0xff202321), canvasHeight: canvasMaxY)
    let segment = CGRect(x: rect.minX + 34 * s, y: rect.maxY - top - 118 * s, width: rect.width - 68 * s, height: 74 * s)
    drawSegmented(context, rect: segment, options: options, selected: selected, scale: s)
}

func drawSegmented(_ context: CGContext, rect: CGRect, options: [String], selected: String, scale s: CGFloat) {
    drawRoundedFill(context, rect: rect, radius: rect.height / 2, fill: 0xffffffff, stroke: 0xff7b8580, strokeWidth: 2 * s)
    let itemW = rect.width / CGFloat(options.count)
    for (index, option) in options.enumerated() {
        let item = CGRect(x: rect.minX + CGFloat(index) * itemW, y: rect.minY, width: itemW, height: rect.height)
        if option == selected {
            drawRoundedFill(context, rect: item.insetBy(dx: 2 * s, dy: 2 * s), radius: rect.height / 2 - 3 * s, fill: 0xffcde8e4, stroke: 0x00282724, strokeWidth: 0)
        }
        if index > 0 {
            context.setStrokeColor(rgb(0xff7b8580))
            context.setLineWidth(1.5 * s)
            context.move(to: CGPoint(x: item.minX, y: rect.minY))
            context.addLine(to: CGPoint(x: item.minX, y: rect.maxY))
            context.strokePath()
        }
        drawCenteredText(context, text: option, fontName: "HelveticaNeue-Bold", size: 23 * s, rect: item, color: rgb(0xff202321))
    }
}

func drawVolumeSlider(_ context: CGContext, rect: CGRect, scale s: CGFloat) {
    context.saveGState()
    context.setLineCap(.round)
    context.setStrokeColor(rgb(0xff7b8580))
    context.setLineWidth(10 * s)
    context.move(to: CGPoint(x: rect.minX, y: rect.midY))
    context.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
    context.strokePath()
    context.setStrokeColor(rgb(0xff2f766e))
    context.move(to: CGPoint(x: rect.minX, y: rect.midY))
    context.addLine(to: CGPoint(x: rect.minX + rect.width * 0.55, y: rect.midY))
    context.strokePath()
    context.setFillColor(rgb(0xff2f766e))
    context.fillEllipse(in: CGRect(x: rect.minX + rect.width * 0.55 - 18 * s, y: rect.midY - 18 * s, width: 36 * s, height: 36 * s))
    context.restoreGState()
}

func drawActionButton(_ context: CGContext, rect: CGRect, fill: UInt32, label: String, icon: String) {
    drawRoundedFill(context, rect: rect, radius: 14, fill: fill, stroke: 0xff282724, strokeWidth: 4)
    drawCenteredText(context, text: "\(icon)  \(label)", fontName: "HelveticaNeue-Bold", size: rect.height * 0.28, rect: rect, color: rgb(0xfffffdf7))
}

func drawPanel(_ context: CGContext, rect: CGRect, radius: CGFloat) {
    drawRoundedFill(context, rect: rect, radius: radius, fill: 0xfffffefa, stroke: 0xff77766f, strokeWidth: 3)
    drawRoundedStroke(context, rect: rect.insetBy(dx: 10, dy: 10), radius: max(1, radius - 4), stroke: 0x998e8a82, strokeWidth: 2)
}

func drawRoundedFill(_ context: CGContext, rect: CGRect, radius: CGFloat, fill: UInt32, stroke: UInt32, strokeWidth: CGFloat) {
    context.saveGState()
    context.addPath(roundedRectPath(rect: rect, radius: radius))
    context.setFillColor(rgb(fill))
    context.fillPath()
    if strokeWidth > 0 {
        drawRoundedStroke(context, rect: rect, radius: radius, stroke: stroke, strokeWidth: strokeWidth)
    }
    context.restoreGState()
}

func drawRoundedStroke(_ context: CGContext, rect: CGRect, radius: CGFloat, stroke: UInt32, strokeWidth: CGFloat) {
    context.saveGState()
    context.addPath(roundedRectPath(rect: rect, radius: radius))
    context.setStrokeColor(rgb(stroke))
    context.setLineWidth(strokeWidth)
    context.strokePath()
    context.restoreGState()
}

func drawHatch(_ context: CGContext, rect: CGRect, color: UInt32, spacing: CGFloat) {
    context.saveGState()
    context.addPath(roundedRectPath(rect: rect, radius: 12))
    context.clip()
    context.setStrokeColor(rgb(color))
    context.setLineWidth(3)
    for x in stride(from: rect.minX - rect.height, through: rect.maxX + rect.height, by: spacing) {
        context.move(to: CGPoint(x: x, y: rect.minY))
        context.addLine(to: CGPoint(x: x + rect.height, y: rect.maxY))
        context.strokePath()
    }
    context.restoreGState()
}

func drawFrame(_ context: CGContext, rect: CGRect, radius: CGFloat) {
    context.saveGState()
    context.setFillColor(rgb(0xfffffdf7))
    context.addPath(roundedRectPath(rect: rect.offsetBy(dx: 18, dy: -22), radius: radius))
    context.fillPath()
    drawRoundedStroke(context, rect: rect, radius: radius, stroke: 0xff282724, strokeWidth: 7)
    drawRoundedStroke(context, rect: rect.insetBy(dx: 14, dy: 14).offsetBy(dx: 5, dy: -5), radius: radius - 10, stroke: 0xaa8e8a82, strokeWidth: 3)
    context.restoreGState()
}

func drawPaperLines(_ context: CGContext, width: CGFloat, height: CGFloat) {
    context.saveGState()
    context.setStrokeColor(rgb(0x1fe6dcc8))
    context.setLineWidth(3)
    context.setLineCap(.round)
    for yFromTop in [310, height - 252] as [CGFloat] {
        let y = height - yFromTop
        roughLine(context, from: CGPoint(x: 74, y: y), to: CGPoint(x: width - 74, y: y - 8), offset: CGPoint(x: 2, y: 2))
    }
    context.restoreGState()
}

func drawText(_ context: CGContext, text: String, fontName: String, size: CGFloat, topLeft: CGPoint, color: CGColor, canvasHeight: CGFloat) {
    let baselineY = canvasHeight - topLeft.y - size
    let font = CTFontCreateWithName(fontName as CFString, size, nil)
    let attributes = [
        kCTFontAttributeName: font,
        kCTForegroundColorAttributeName: color,
    ] as CFDictionary
    let attributed = CFAttributedStringCreate(nil, text as CFString, attributes)!
    let line = CTLineCreateWithAttributedString(attributed)
    context.saveGState()
    context.textPosition = CGPoint(x: topLeft.x, y: baselineY)
    CTLineDraw(line, context)
    context.restoreGState()
}

func drawCenteredText(_ context: CGContext, text: String, fontName: String, size: CGFloat, rect: CGRect, color: CGColor) {
    let font = CTFontCreateWithName(fontName as CFString, size, nil)
    let attributes = [
        kCTFontAttributeName: font,
        kCTForegroundColorAttributeName: color,
    ] as CFDictionary
    let attributed = CFAttributedStringCreate(nil, text as CFString, attributes)!
    let line = CTLineCreateWithAttributedString(attributed)
    let bounds = CTLineGetBoundsWithOptions(line, [.useGlyphPathBounds])
    context.saveGState()
    context.textPosition = CGPoint(
        x: rect.midX - bounds.width / 2,
        y: rect.midY - bounds.height / 2 - bounds.minY
    )
    CTLineDraw(line, context)
    context.restoreGState()
}

func rectFromTopLeft(x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat, canvasHeight: CGFloat) -> CGRect {
    CGRect(x: x, y: canvasHeight - y - height, width: width, height: height)
}

func roundedRectPath(rect: CGRect, radius: CGFloat) -> CGPath {
    let path = CGMutablePath()
    path.move(to: CGPoint(x: rect.minX + radius, y: rect.minY))
    path.addLine(to: CGPoint(x: rect.maxX - radius, y: rect.minY))
    path.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY + radius), control: CGPoint(x: rect.maxX, y: rect.minY))
    path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - radius))
    path.addQuadCurve(to: CGPoint(x: rect.maxX - radius, y: rect.maxY), control: CGPoint(x: rect.maxX, y: rect.maxY))
    path.addLine(to: CGPoint(x: rect.minX + radius, y: rect.maxY))
    path.addQuadCurve(to: CGPoint(x: rect.minX, y: rect.maxY - radius), control: CGPoint(x: rect.minX, y: rect.maxY))
    path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + radius))
    path.addQuadCurve(to: CGPoint(x: rect.minX + radius, y: rect.minY), control: CGPoint(x: rect.minX, y: rect.minY))
    path.closeSubpath()
    return path
}

func roughLine(_ context: CGContext, from start: CGPoint, to end: CGPoint, offset: CGPoint = CGPoint(x: 4, y: 5)) {
    context.move(to: start)
    context.addLine(to: end)
    context.strokePath()
    context.move(to: CGPoint(x: start.x + offset.x, y: start.y + offset.y))
    context.addLine(to: CGPoint(x: end.x - offset.x, y: end.y + offset.y * 0.5))
    context.strokePath()
}

func rgb(_ value: UInt32) -> CGColor {
    let alpha = CGFloat((value >> 24) & 0xff) / 255
    let red = CGFloat((value >> 16) & 0xff) / 255
    let green = CGFloat((value >> 8) & 0xff) / 255
    let blue = CGFloat(value & 0xff) / 255
    return CGColor(red: red, green: green, blue: blue, alpha: alpha)
}

enum ScreenshotError: Error {
    case contextCreationFailed
    case imageWriteFailed(String)
}
