import os
from PIL import Image, ImageDraw

def create_high_tech_icon(output_path="app_icon.ico"):
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Background rounded rectangle with dark graphite/slate gradient
    pad = 12
    r = 48
    
    # Outer glow
    for i in range(8, 0, -1):
        alpha = int(18 * (8 - i) / 8)
        draw.rounded_rectangle(
            [pad - i, pad - i, size - pad + i, size - pad + i],
            radius=r + i,
            fill=(0, 212, 255, alpha)
        )
    
    # Base dark container
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=r,
        fill=(11, 15, 23, 255),
        outline=(0, 212, 255, 180),
        width=4
    )

    # Inner subtle cyber grid lines
    grid_color = (0, 212, 255, 30)
    for x in range(pad + 20, size - pad, 28):
        draw.line([(x, pad + 10), (x, size - pad - 10)], fill=grid_color, width=1)
    for y in range(pad + 20, size - pad, 28):
        draw.line([(pad + 10, y), (size - pad - 10, y)], fill=grid_color, width=1)

    # 2. Draw Scales of Justice / Cyber Balance in Cyan Neon
    cyan_neon = (0, 212, 255, 255)
    indigo_neon = (99, 102, 241, 255)
    emerald_neon = (0, 255, 136, 255)
    
    cx, cy = size // 2, size // 2

    # Central beam (pillar)
    draw.line([(cx, cy - 60), (cx, cy + 55)], fill=cyan_neon, width=6)
    
    # Base stand
    draw.line([(cx - 42, cy + 55), (cx + 42, cy + 55)], fill=cyan_neon, width=6)
    draw.line([(cx - 28, cy + 47), (cx + 28, cy + 47)], fill=indigo_neon, width=4)

    # Top apex point & glowing ring
    draw.ellipse([cx - 10, cy - 70, cx + 10, cy - 50], fill=(11, 15, 23, 255), outline=emerald_neon, width=3)
    draw.ellipse([cx - 4, cy - 64, cx + 4, cy - 56], fill=emerald_neon)

    # Horizontal balance beam
    draw.line([(cx - 68, cy - 36), (cx + 68, cy - 36)], fill=cyan_neon, width=5)
    # Left pivot & Right pivot
    draw.ellipse([cx - 72, cy - 40, cx - 64, cy - 32], fill=indigo_neon)
    draw.ellipse([cx + 64, cy - 40, cx + 72, cy - 32], fill=indigo_neon)

    # Left pan strings & pan
    left_x = cx - 68
    draw.line([(left_x, cy - 36), (left_x - 22, cy + 8)], fill=(0, 212, 255, 200), width=2)
    draw.line([(left_x, cy - 36), (left_x + 22, cy + 8)], fill=(0, 212, 255, 200), width=2)
    draw.arc([left_x - 26, cy - 5, left_x + 26, cy + 18], start=0, end=180, fill=cyan_neon, width=4)
    draw.line([(left_x - 26, cy + 6), (left_x + 26, cy + 6)], fill=cyan_neon, width=2)

    # Right pan strings & pan (slightly tilted for dynamic balance)
    right_x = cx + 68
    draw.line([(right_x, cy - 36), (right_x - 22, cy + 16)], fill=(0, 212, 255, 200), width=2)
    draw.line([(right_x, cy - 36), (right_x + 22, cy + 16)], fill=(0, 212, 255, 200), width=2)
    draw.arc([right_x - 26, cy + 3, right_x + 26, cy + 26], start=0, end=180, fill=cyan_neon, width=4)
    draw.line([(right_x - 26, cy + 14), (right_x + 26, cy + 14)], fill=cyan_neon, width=2)

    # Glowing AI nodes / accents
    draw.ellipse([left_x - 3, cy + 3, left_x + 3, cy + 9], fill=emerald_neon)
    draw.ellipse([right_x - 3, cy + 11, right_x + 3, cy + 17], fill=indigo_neon)

    # HUD Corner Bracket Accents inside
    corner_len = 16
    c_pad = pad + 12
    # Top-left
    draw.line([(c_pad, c_pad), (c_pad + corner_len, c_pad)], fill=cyan_neon, width=2)
    draw.line([(c_pad, c_pad), (c_pad, c_pad + corner_len)], fill=cyan_neon, width=2)
    # Bottom-right
    br_x = size - pad - 12
    br_y = size - pad - 12
    draw.line([(br_x - corner_len, br_y), (br_x, br_y)], fill=cyan_neon, width=2)
    draw.line([(br_x, br_y - corner_len), (br_x, br_y)], fill=cyan_neon, width=2)

    # Save as multi-size ICO
    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img.save(output_path, format="ICO", sizes=icon_sizes)
    print(f"[OK] Icon created: {output_path}")

if __name__ == "__main__":
    create_high_tech_icon("app_icon.ico")
