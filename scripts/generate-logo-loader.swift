import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

struct RGBA {
    var r: UInt8
    var g: UInt8
    var b: UInt8
    var a: UInt8
}

func clamp(_ value: Double, _ minValue: Double = 0, _ maxValue: Double = 1) -> Double {
    min(max(value, minValue), maxValue)
}

func readImage(_ url: URL, outputSize: Int = 256) throws -> (width: Int, height: Int, pixels: [RGBA]) {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw NSError(domain: "LogoLoader", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not read image: \(url.path)"])
    }

    let width = outputSize
    let height = outputSize
    var bytes = [UInt8](repeating: 0, count: width * height * 4)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: &bytes,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        throw NSError(domain: "LogoLoader", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not create bitmap context"])
    }

    context.clear(CGRect(x: 0, y: 0, width: width, height: height))
    context.interpolationQuality = .high
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

    var pixels = [RGBA]()
    pixels.reserveCapacity(width * height)
    for index in stride(from: 0, to: bytes.count, by: 4) {
        let alpha = bytes[index + 3]
        if alpha > 0 {
            let a = Double(alpha) / 255
            pixels.append(RGBA(
                r: UInt8(clamp(Double(bytes[index]) / a, 0, 255)),
                g: UInt8(clamp(Double(bytes[index + 1]) / a, 0, 255)),
                b: UInt8(clamp(Double(bytes[index + 2]) / a, 0, 255)),
                a: alpha
            ))
        } else {
            pixels.append(RGBA(r: 0, g: 0, b: 0, a: 0))
        }
    }

    return (width, height, pixels)
}

let palette: [(UInt8, UInt8, UInt8)] = {
    var colors: [(UInt8, UInt8, UInt8)] = [(0, 0, 0)]
    colors += [
        (244, 249, 231), (226, 242, 179), (204, 231, 111), (184, 221, 43),
        (151, 205, 0), (125, 181, 0), (95, 154, 0), (55, 129, 70),
        (255, 255, 255), (248, 250, 244), (230, 237, 221), (202, 216, 188)
    ]
    let levels: [UInt8] = [0, 51, 102, 153, 204, 255]
    for r in levels {
        for g in levels {
            for b in levels {
                colors.append((r, g, b))
            }
        }
    }
    while colors.count < 256 {
        colors.append((0, 0, 0))
    }
    return Array(colors.prefix(256))
}()

func nearestPaletteIndex(r: Double, g: Double, b: Double, a: UInt8) -> UInt8 {
    if a < 16 { return 0 }

    var bestIndex = 1
    var bestDistance = Double.greatestFiniteMagnitude
    for index in 1..<palette.count {
        let color = palette[index]
        let dr = r - Double(color.0)
        let dg = g - Double(color.1)
        let db = b - Double(color.2)
        let distance = dr * dr * 0.70 + dg * dg + db * db * 0.55
        if distance < bestDistance {
            bestDistance = distance
            bestIndex = index
            if distance == 0 { break }
        }
    }

    return UInt8(bestIndex)
}

func makeIndexedFrame(width: Int, height: Int, source: [RGBA], progress: Double) -> [UInt8] {
    var indices = [UInt8](repeating: 0, count: width * height)
    let fillY = Double(height) * (1 - progress)
    let feather = 24.0

    for y in 0..<height {
        for x in 0..<width {
            let pixelIndex = y * width + x
            let sourcePixel = source[pixelIndex]
            let alpha = sourcePixel.a

            guard alpha >= 16 else { continue }

            let reveal = clamp((Double(y) - fillY + feather) / feather)
            let baseR = Double(sourcePixel.r) * 0.30 + 244 * 0.70
            let baseG = Double(sourcePixel.g) * 0.30 + 249 * 0.70
            let baseB = Double(sourcePixel.b) * 0.30 + 231 * 0.70
            let r = baseR * (1 - reveal) + Double(sourcePixel.r) * reveal
            let g = baseG * (1 - reveal) + Double(sourcePixel.g) * reveal
            let b = baseB * (1 - reveal) + Double(sourcePixel.b) * reveal
            indices[pixelIndex] = nearestPaletteIndex(r: r, g: g, b: b, a: alpha)
        }
    }

    return indices
}

func appendUInt16LE(_ value: Int, to data: inout Data) {
    data.append(UInt8(value & 0xff))
    data.append(UInt8((value >> 8) & 0xff))
}

func lzwEncode(_ indices: [UInt8], minCodeSize: Int = 8) -> Data {
    let clearCode = 1 << minCodeSize
    let endCode = clearCode + 1
    var codeSize = minCodeSize + 1
    var bytes = [UInt8]()
    var bitBuffer = 0
    var bitCount = 0

    func writeCode(_ code: Int) {
        bitBuffer |= code << bitCount
        bitCount += codeSize
        while bitCount >= 8 {
            bytes.append(UInt8(bitBuffer & 0xff))
            bitBuffer >>= 8
            bitCount -= 8
        }
    }

    // Keep the stream deliberately simple and decoder-friendly: literals only,
    // with frequent clears before the decoder expands beyond 9-bit codes.
    writeCode(clearCode)
    var literalCountSinceClear = 0
    for index in indices {
        if literalCountSinceClear >= 240 {
            writeCode(clearCode)
            codeSize = minCodeSize + 1
            literalCountSinceClear = 0
        }
        writeCode(Int(index))
        literalCountSinceClear += 1
    }

    writeCode(endCode)
    if bitCount > 0 {
        bytes.append(UInt8(bitBuffer & 0xff))
    }

    return Data(bytes)
}

func appendSubBlocks(_ source: Data, to output: inout Data) {
    var offset = 0
    while offset < source.count {
        let count = min(255, source.count - offset)
        output.append(UInt8(count))
        output.append(source.subdata(in: offset..<(offset + count)))
        offset += count
    }
    output.append(0)
}

func writeGIF(width: Int, height: Int, frames: [[UInt8]], outputURL: URL, delayCentiseconds: Int) throws {
    var output = Data()
    output.append("GIF89a".data(using: .ascii)!)
    appendUInt16LE(width, to: &output)
    appendUInt16LE(height, to: &output)
    output.append(0xf7)
    output.append(0)
    output.append(0)

    for color in palette {
        output.append(color.0)
        output.append(color.1)
        output.append(color.2)
    }

    output.append(contentsOf: [0x21, 0xff, 0x0b])
    output.append("NETSCAPE2.0".data(using: .ascii)!)
    output.append(contentsOf: [0x03, 0x01, 0x00, 0x00, 0x00])

    for frame in frames {
        output.append(contentsOf: [0x21, 0xf9, 0x04, 0x09])
        appendUInt16LE(delayCentiseconds, to: &output)
        output.append(0)
        output.append(0)

        output.append(0x2c)
        appendUInt16LE(0, to: &output)
        appendUInt16LE(0, to: &output)
        appendUInt16LE(width, to: &output)
        appendUInt16LE(height, to: &output)
        output.append(0)

        output.append(8)
        appendSubBlocks(lzwEncode(frame), to: &output)
    }

    output.append(0x3b)
    try output.write(to: outputURL, options: .atomic)
}

func makeOpaqueFrame(width: Int, height: Int, source: [RGBA], progress: Double) throws -> CGImage {
    var bytes = [UInt8](repeating: 0, count: width * height * 4)
    let fillY = Double(height) * (1 - progress)
    let feather = 24.0
    let bgR = 255.0
    let bgG = 253.0
    let bgB = 248.0

    for y in 0..<height {
        for x in 0..<width {
            let pixelIndex = y * width + x
            let sourcePixel = source[pixelIndex]
            let outIndex = pixelIndex * 4
            let alpha = Double(sourcePixel.a) / 255.0

            let reveal = clamp((Double(y) - fillY + feather) / feather)
            let baseR = Double(sourcePixel.r) * 0.30 + 244 * 0.70
            let baseG = Double(sourcePixel.g) * 0.30 + 249 * 0.70
            let baseB = Double(sourcePixel.b) * 0.30 + 231 * 0.70
            let r = baseR * (1 - reveal) + Double(sourcePixel.r) * reveal
            let g = baseG * (1 - reveal) + Double(sourcePixel.g) * reveal
            let b = baseB * (1 - reveal) + Double(sourcePixel.b) * reveal

            bytes[outIndex] = UInt8(clamp(r * alpha + bgR * (1 - alpha), 0, 255))
            bytes[outIndex + 1] = UInt8(clamp(g * alpha + bgG * (1 - alpha), 0, 255))
            bytes[outIndex + 2] = UInt8(clamp(b * alpha + bgB * (1 - alpha), 0, 255))
            bytes[outIndex + 3] = 255
        }
    }

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let provider = CGDataProvider(data: Data(bytes) as CFData),
          let image = CGImage(
            width: width,
            height: height,
            bitsPerComponent: 8,
            bitsPerPixel: 32,
            bytesPerRow: width * 4,
            space: colorSpace,
            bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
            provider: provider,
            decode: nil,
            shouldInterpolate: true,
            intent: .defaultIntent
          ) else {
        throw NSError(domain: "LogoLoader", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not create frame image"])
    }

    return image
}

func writeImageIOGIF(frames: [CGImage], outputURL: URL, delay: Double) throws {
    guard let destination = CGImageDestinationCreateWithURL(
        outputURL as CFURL,
        UTType.gif.identifier as CFString,
        frames.count,
        nil
    ) else {
        throw NSError(domain: "LogoLoader", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not create GIF destination"])
    }

    CGImageDestinationSetProperties(destination, [
        kCGImagePropertyGIFDictionary: [
            kCGImagePropertyGIFLoopCount: 0
        ]
    ] as CFDictionary)

    let frameProperties = [
        kCGImagePropertyGIFDictionary: [
            kCGImagePropertyGIFDelayTime: delay,
            kCGImagePropertyGIFUnclampedDelayTime: delay
        ]
    ] as CFDictionary

    for frame in frames {
        CGImageDestinationAddImage(destination, frame, frameProperties)
    }

    if !CGImageDestinationFinalize(destination) {
        throw NSError(domain: "LogoLoader", code: 5, userInfo: [NSLocalizedDescriptionKey: "Could not finalize GIF"])
    }
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let inputURL = root.appendingPathComponent("public/app-icon-512.png")
let outputURL = root.appendingPathComponent("public/ons-tennis-logo-fill-loader.gif")

let source = try readImage(inputURL)
var frames = [[UInt8]]()
for index in 0..<28 {
    let phase = Double(index) / 27.0
    let progress = phase < 0.84 ? 0.5 - 0.5 * cos(.pi * phase / 0.84) : 1
    frames.append(makeIndexedFrame(width: source.width, height: source.height, source: source.pixels, progress: progress))
}

try writeGIF(width: source.width, height: source.height, frames: frames, outputURL: outputURL, delayCentiseconds: 5)
print(outputURL.path)
