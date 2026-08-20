import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct IconTarget {
    let path: String
    let size: Int
}

let root = FileManager.default.currentDirectoryPath

let iosTargets: [IconTarget] = [
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@1x.png", size: 20),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@2x.png", size: 40),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@3x.png", size: 60),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@1x.png", size: 29),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@2x.png", size: 58),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@3x.png", size: 87),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@1x.png", size: 40),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@2x.png", size: 80),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@3x.png", size: 120),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-60x60@2x.png", size: 120),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-60x60@3x.png", size: 180),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-76x76@1x.png", size: 76),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-76x76@2x.png", size: 152),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-83.5x83.5@2x.png", size: 167),
    .init(path: "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png", size: 1024),
]

let androidTargets: [IconTarget] = [
    .init(path: "android/app/src/main/res/mipmap-mdpi/ic_launcher.png", size: 48),
    .init(path: "android/app/src/main/res/mipmap-hdpi/ic_launcher.png", size: 72),
    .init(path: "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png", size: 96),
    .init(path: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png", size: 144),
    .init(path: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", size: 192),
]

for target in iosTargets + androidTargets {
    let url = URL(fileURLWithPath: root).appendingPathComponent(target.path)
    try FileManager.default.createDirectory(
        at: url.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
    try renderIcon(size: target.size, to: url)
}

func renderIcon(size: Int, to url: URL) throws {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: nil,
        width: size,
        height: size,
        bitsPerComponent: 8,
        bytesPerRow: size * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        throw IconError.contextCreationFailed
    }

    let s = CGFloat(size) / 1024.0
    context.scaleBy(x: s, y: s)
    context.setFillColor(rgb(0xfffffefa))
    context.fill(CGRect(x: 0, y: 0, width: 1024, height: 1024))

    drawPaperGrain(context)
    drawChimeMark(context)

    guard let image = context.makeImage(),
          let destination = CGImageDestinationCreateWithURL(
            url as CFURL,
            UTType.png.identifier as CFString,
            1,
            nil
          ) else {
        throw IconError.imageCreationFailed
    }

    CGImageDestinationAddImage(destination, image, nil)
    if !CGImageDestinationFinalize(destination) {
        throw IconError.writeFailed(url.path)
    }
}

func drawPaperGrain(_ context: CGContext) {
    context.saveGState()
    context.setStrokeColor(rgb(0x1fd8cfbf))
    context.setLineWidth(3)
    context.setLineCap(.round)
    let lines: [(CGFloat, CGFloat, CGFloat, CGFloat)] = [
        (102, 164, 860, 154),
        (126, 836, 892, 846),
        (84, 894, 782, 882),
    ]
    for line in lines {
        roughLine(
            context,
            from: CGPoint(x: line.0, y: line.1),
            to: CGPoint(x: line.2, y: line.3),
            offset: CGPoint(x: 2, y: 2)
        )
    }
    context.restoreGState()
}

func drawChimeMark(_ context: CGContext) {
    context.saveGState()

    drawRingingArcs(context)
    drawHatchedText(context, text: "C", fontName: "AvenirNext-Heavy", size: 536, at: CGPoint(x: 88, y: 414))
    drawText(context, text: "hime", fontName: "HelveticaNeue-Bold", size: 176, at: CGPoint(x: 454, y: 390), color: rgb(0x60282724))
    drawText(context, text: "hime", fontName: "HelveticaNeue-Bold", size: 176, at: CGPoint(x: 444, y: 402), color: rgb(0xff282724))
    drawChimeDot(context)

    context.restoreGState()
}

func drawRingingArcs(_ context: CGContext) {
    context.saveGState()
    context.setLineCap(.round)

    let center = CGPoint(x: 618, y: 392)
    let arcs: [(CGFloat, CGFloat, CGFloat, UInt32)] = [
        (74, -0.72, 0.74, 0xaa2f766e),
        (124, -0.65, 0.66, 0x883a9f91),
        (178, -0.58, 0.58, 0x665fb48a),
    ]

    for arc in arcs {
        context.setStrokeColor(rgb(arc.3))
        context.setLineWidth(max(10, arc.0 / 9))
        context.addArc(
            center: center,
            radius: arc.0,
            startAngle: arc.1,
            endAngle: arc.2,
            clockwise: false
        )
        context.strokePath()
    }

    context.restoreGState()
}

func drawChimeDot(_ context: CGContext) {
    context.saveGState()
    let rect = CGRect(x: 610, y: 492, width: 54, height: 54)
    context.setFillColor(rgb(0xff2f766e))
    context.fillEllipse(in: rect)
    context.setStrokeColor(rgb(0xff282724))
    context.setLineWidth(6)
    context.strokeEllipse(in: rect.insetBy(dx: 3, dy: 3))
    context.restoreGState()
}

func drawHatchedText(_ context: CGContext, text: String, fontName: String, size: CGFloat, at point: CGPoint) {
    guard let path = textPath(text: text, fontName: fontName, size: size, at: point) else {
        drawText(context, text: text, fontName: fontName, size: size, at: point, color: rgb(0xff111111))
        return
    }

    context.saveGState()
    context.addPath(path)
    context.setFillColor(rgb(0xfffffefa))
    context.fillPath()

    context.addPath(path)
    context.clip()

    context.setStrokeColor(rgb(0xff111111))
    context.setLineWidth(18)
    context.setLineCap(.round)

    var x: CGFloat = -160
    while x < 760 {
        roughLine(
            context,
            from: CGPoint(x: x, y: 760),
            to: CGPoint(x: x + 420, y: 40),
            offset: CGPoint(x: 4, y: 4)
        )
        x += 46
    }
    context.restoreGState()

    context.saveGState()
    context.addPath(path)
    context.setStrokeColor(rgb(0xff111111))
    context.setLineWidth(9)
    context.strokePath()
    context.restoreGState()
}

func drawText(_ context: CGContext, text: String, fontName: String, size: CGFloat, at point: CGPoint, color: CGColor) {
    let font = CTFontCreateWithName(fontName as CFString, size, nil)
    let attributes = [
        kCTFontAttributeName: font,
        kCTForegroundColorAttributeName: color,
    ] as CFDictionary
    let attributed = CFAttributedStringCreate(nil, text as CFString, attributes)!
    let line = CTLineCreateWithAttributedString(attributed)

    context.saveGState()
    context.textPosition = point
    CTLineDraw(line, context)
    context.restoreGState()
}

func textPath(text: String, fontName: String, size: CGFloat, at point: CGPoint) -> CGPath? {
    let font = CTFontCreateWithName(fontName as CFString, size, nil)
    let attributes = [kCTFontAttributeName: font] as CFDictionary
    let attributed = CFAttributedStringCreate(nil, text as CFString, attributes)!
    let line = CTLineCreateWithAttributedString(attributed)
    let runs = CTLineGetGlyphRuns(line) as! [CTRun]
    let letters = CGMutablePath()

    for run in runs {
        let runFont = (CTRunGetAttributes(run) as NSDictionary)[kCTFontAttributeName as String] as! CTFont
        let count = CTRunGetGlyphCount(run)
        var glyphs = Array(repeating: CGGlyph(), count: count)
        var positions = Array(repeating: CGPoint.zero, count: count)
        CTRunGetGlyphs(run, CFRangeMake(0, 0), &glyphs)
        CTRunGetPositions(run, CFRangeMake(0, 0), &positions)

        for index in 0..<count {
            guard let glyphPath = CTFontCreatePathForGlyph(runFont, glyphs[index], nil) else {
                continue
            }
            let transform = CGAffineTransform(
                translationX: point.x + positions[index].x,
                y: point.y + positions[index].y
            )
            letters.addPath(glyphPath, transform: transform)
        }
    }

    return letters
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

enum IconError: Error {
    case contextCreationFailed
    case imageCreationFailed
    case writeFailed(String)
}
