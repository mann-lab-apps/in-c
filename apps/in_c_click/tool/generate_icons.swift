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

    drawSoftHatch(context)
    drawStaff(context)
    drawQuarterNote(context)
    drawClickMark(context)

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

func drawSoftHatch(_ context: CGContext) {
    context.saveGState()
    context.setStrokeColor(rgb(0x3385cbff))
    context.setLineWidth(9)
    context.setLineCap(.round)
    let clip = CGMutablePath()
    clip.addEllipse(in: CGRect(x: 620, y: 224, width: 214, height: 214))
    context.addPath(clip)
    context.clip()

    var x: CGFloat = 560
    while x < 900 {
        context.move(to: CGPoint(x: x, y: 454))
        context.addLine(to: CGPoint(x: x + 150, y: 210))
        context.strokePath()
        x += 52
    }
    context.restoreGState()
}

func drawStaff(_ context: CGContext) {
    context.setStrokeColor(rgb(0xff282724))
    context.setLineWidth(12)
    context.setLineCap(.round)

    for index in 0..<5 {
        let y = CGFloat(328 + index * 50)
        roughLine(context, from: CGPoint(x: 174, y: y), to: CGPoint(x: 820, y: y))
    }
}

func drawQuarterNote(_ context: CGContext) {
    context.setFillColor(rgb(0xff111111))
    context.setStrokeColor(rgb(0xff111111))
    context.setLineWidth(26)
    context.setLineCap(.round)

    context.saveGState()
    context.translateBy(x: 390, y: 636)
    context.rotate(by: -0.28)
    context.fillEllipse(in: CGRect(x: -142, y: -82, width: 284, height: 164))
    context.restoreGState()

    context.setLineWidth(38)
    roughLine(context, from: CGPoint(x: 520, y: 624), to: CGPoint(x: 520, y: 238))
    context.setLineWidth(26)
    roughLine(context, from: CGPoint(x: 520, y: 244), to: CGPoint(x: 690, y: 244))
}

func drawClickMark(_ context: CGContext) {
    context.setStrokeColor(rgb(0xffb43d2f))
    context.setFillColor(rgb(0xffb43d2f))
    context.setLineWidth(16)
    context.strokeEllipse(in: CGRect(x: 656, y: 360, width: 150, height: 150))
    context.setLineWidth(8)
    context.strokeEllipse(in: CGRect(x: 682, y: 386, width: 98, height: 98))
    context.fillEllipse(in: CGRect(x: 720, y: 424, width: 22, height: 22))
}

func roughLine(_ context: CGContext, from start: CGPoint, to end: CGPoint) {
    context.move(to: start)
    context.addLine(to: end)
    context.strokePath()
    context.move(to: CGPoint(x: start.x + 4, y: start.y + 6))
    context.addLine(to: CGPoint(x: end.x - 5, y: end.y + 3))
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
