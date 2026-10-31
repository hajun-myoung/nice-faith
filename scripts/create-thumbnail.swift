// Run on macOS: swift scripts/create-thumbnail.swift
// Generates the fixed 800×400 Kakao link thumbnail without external assets.
import AppKit
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 800, pixelsHigh: 400, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
func color(_ hex: UInt32) -> NSColor { NSColor(red: CGFloat((hex >> 16) & 255)/255, green: CGFloat((hex >> 8) & 255)/255, blue: CGFloat(hex & 255)/255, alpha: 1) }
func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ radius: CGFloat, _ fill: UInt32) {
  color(fill).setFill(); NSBezierPath(roundedRect: NSRect(x:x,y:y,width:w,height:h), xRadius:radius, yRadius:radius).fill()
}
func text(_ value: String, _ x: CGFloat, _ y: CGFloat, _ size: CGFloat, _ fill: UInt32, _ weight: NSFont.Weight = .regular) {
  let font = NSFont(name: "AppleSDGothicNeo-\(weight == .bold ? "Bold" : "Regular")", size:size) ?? NSFont.systemFont(ofSize:size, weight:weight)
  (value as NSString).draw(at:NSPoint(x:x,y:y), withAttributes:[.font:font,.foregroundColor:color(fill)])
}
rect(0,0,800,400,0,0xF5F7FB)
rect(0,386,800,14,0,0x2563EB)
text("NICE FAITH",50,327,20,0x2563EB,.bold)
text("당신의 믿음,",50,228,43,0x15223B,.bold)
text("몇 점입니까?",50,170,48,0x2563EB,.bold)
text("12개의 질문으로 확인하는",52,109,18,0x52647D)
text("나의 신앙활동 점수",52,80,18,0x52647D)
rect(479,76,270,242,22,0xE0EAFE)
rect(468,88,270,242,22,0xFFFFFF)
text("나의 신앙활동 리포트",490,280,16,0x52647D)
text("???",490,171,76,0x15223B,.bold)
text("점",640,184,21,0x52647D)
for i in 0..<5 { rect(491+CGFloat(i)*43,142,37,7,3,[0xBDD4FF,0x8AB3FC,0x5C95F4,0x2563EB,0xDDE7F8][i]) }
text("예배 · 기도 · 말씀 · 공동체 · 일상",490,110,11,0x52647D)
text("독립 교육용 패러디 · 실제 신앙을 평가하지 않습니다.",52,29,12,0x64748B)
NSGraphicsContext.restoreGraphicsState()
let png = bitmap.representation(using:.png,properties:[:])!
try png.write(to:URL(fileURLWithPath:FileManager.default.currentDirectoryPath).appendingPathComponent("public/og-default.png"))
print("Generated public/og-default.png (800×400)")
