import CoreGraphics
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

    context.translateBy(x: 0, y: 1024)
    context.scaleBy(x: 1, y: -1)

    drawPaperGrain(context)
    drawImaginedCMetronome(context)

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
        roughLine(context, from: CGPoint(x: line.0, y: line.1), to: CGPoint(x: line.2, y: line.3), offset: CGPoint(x: 2, y: 2))
    }
    context.restoreGState()
}

func drawImaginedCMetronome(_ context: CGContext) {
    context.saveGState()
    context.translateBy(x: 512, y: 520)
    context.scaleBy(x: 1.14, y: 1.14)
    context.translateBy(x: -512, y: -520)

    let body = metronomeBodyPath(offset: .zero)

    context.saveGState()
    context.addPath(metronomeBodyPath(offset: CGPoint(x: 20, y: 22)))
    context.setFillColor(rgb(0x20d8cfbf))
    context.fillPath()
    context.restoreGState()

    context.saveGState()
    context.addPath(body)
    context.clip()
    drawPlausibleBodyFill(context)
    context.restoreGState()

    drawOpenMetronomeOutline(context, offset: CGPoint(x: -8, y: 7), color: rgb(0x8a282724), lineWidth: 6)
    drawOpenMetronomeOutline(context, offset: .zero, color: rgb(0xff282724), lineWidth: 14)
    drawPlausibleTempoScale(context)
    drawPlausiblePendulum(context)
    context.restoreGState()
}

func drawPlausibleBodyFill(_ context: CGContext) {
    context.setFillColor(rgb(0xfffffdf7))
    context.fill(CGRect(x: 0, y: 0, width: 1024, height: 1024))

    context.setStrokeColor(rgb(0x2f85cbff))
    context.setLineWidth(7)
    context.setLineCap(.round)

    let hatchLines: [(CGFloat, CGFloat, CGFloat, CGFloat)] = [
        (334, 690, 500, 424),
        (414, 724, 620, 392),
        (504, 724, 710, 394),
        (600, 686, 756, 432),
    ]

    for line in hatchLines {
        roughLine(
            context,
            from: CGPoint(x: line.0, y: line.1),
            to: CGPoint(x: line.2, y: line.3),
            offset: CGPoint(x: 4, y: -3)
        )
    }
}

func drawOpenMetronomeOutline(_ context: CGContext, offset: CGPoint, color: CGColor, lineWidth: CGFloat) {
    context.saveGState()
    context.setStrokeColor(color)
    context.setLineWidth(lineWidth)
    context.setLineCap(.round)
    context.setLineJoin(.round)

    let path = CGMutablePath()
    path.move(to: CGPoint(x: 620 + offset.x, y: 286 + offset.y))
    path.addLine(to: CGPoint(x: 558 + offset.x, y: 222 + offset.y))
    path.addQuadCurve(
        to: CGPoint(x: 466 + offset.x, y: 222 + offset.y),
        control: CGPoint(x: 512 + offset.x, y: 204 + offset.y)
    )
    path.addLine(to: CGPoint(x: 258 + offset.x, y: 794 + offset.y))
    path.addQuadCurve(
        to: CGPoint(x: 300 + offset.x, y: 836 + offset.y),
        control: CGPoint(x: 252 + offset.x, y: 824 + offset.y)
    )
    path.addLine(to: CGPoint(x: 724 + offset.x, y: 836 + offset.y))
    path.addQuadCurve(
        to: CGPoint(x: 750 + offset.x, y: 802 + offset.y),
        control: CGPoint(x: 762 + offset.x, y: 826 + offset.y)
    )
    context.addPath(path)
    context.strokePath()

    roughLine(
        context,
        from: CGPoint(x: 714 + offset.x, y: 336 + offset.y),
        to: CGPoint(x: 762 + offset.x, y: 468 + offset.y),
        offset: CGPoint(x: 2, y: 2)
    )
    roughLine(
        context,
        from: CGPoint(x: 762 + offset.x, y: 610 + offset.y),
        to: CGPoint(x: 718 + offset.x, y: 742 + offset.y),
        offset: CGPoint(x: 2, y: 2)
    )
    context.restoreGState()
}

func drawPlausibleTempoScale(_ context: CGContext) {
    context.saveGState()
    context.setStrokeColor(rgb(0xff282724))
    context.setLineWidth(8)
    context.setLineCap(.round)

    let marks: [(CGFloat, CGFloat, CGFloat)] = [
        (400, 394, 48),
        (382, 456, 62),
        (368, 522, 68),
        (370, 588, 58),
        (386, 650, 46),
    ]

    for (x, y, width) in marks {
        roughLine(
            context,
            from: CGPoint(x: x, y: y),
            to: CGPoint(x: x + width, y: y),
            offset: CGPoint(x: 2, y: 2)
        )
    }
    context.restoreGState()
}

func drawPlausiblePendulum(_ context: CGContext) {
    context.saveGState()
    context.setStrokeColor(rgb(0xff111111))
    context.setFillColor(rgb(0xff111111))
    context.setLineWidth(17)
    context.setLineCap(.round)

    roughLine(
        context,
        from: CGPoint(x: 520, y: 756),
        to: CGPoint(x: 608, y: 300),
        offset: CGPoint(x: 3, y: 4)
    )

    context.saveGState()
    context.translateBy(x: 566, y: 506)
    context.rotate(by: -0.18)
    roundedRect(context, rect: CGRect(x: -47, y: -30, width: 94, height: 60), radius: 16)
    context.fillPath()
    context.restoreGState()

    context.fillEllipse(in: CGRect(x: 503, y: 738, width: 34, height: 34))
    context.restoreGState()
}

func metronomeBodyPath(offset: CGPoint) -> CGMutablePath {
    let path = CGMutablePath()
    path.move(to: CGPoint(x: 466 + offset.x, y: 222 + offset.y))
    path.addQuadCurve(
        to: CGPoint(x: 558 + offset.x, y: 222 + offset.y),
        control: CGPoint(x: 512 + offset.x, y: 204 + offset.y)
    )
    path.addLine(to: CGPoint(x: 766 + offset.x, y: 794 + offset.y))
    path.addQuadCurve(
        to: CGPoint(x: 724 + offset.x, y: 836 + offset.y),
        control: CGPoint(x: 772 + offset.x, y: 822 + offset.y)
    )
    path.addLine(to: CGPoint(x: 300 + offset.x, y: 836 + offset.y))
    path.addQuadCurve(
        to: CGPoint(x: 258 + offset.x, y: 794 + offset.y),
        control: CGPoint(x: 252 + offset.x, y: 824 + offset.y)
    )
    path.addLine(to: CGPoint(x: 466 + offset.x, y: 222 + offset.y))
    path.closeSubpath()
    return path
}

func roundedRect(_ context: CGContext, rect: CGRect, radius: CGFloat) {
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
    context.addPath(path)
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
