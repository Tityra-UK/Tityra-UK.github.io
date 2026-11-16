"""Regenerate the checked-in sharing image. Optional tools: Pillow, fonttools."""
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def font(relative, size):
    face = TTFont(ASSETS / relative)
    face.flavor = None
    data = BytesIO()
    face.save(data)
    data.seek(0)
    return ImageFont.truetype(data, size)


image = Image.new("RGB", (1200, 630), "#f7f7f5")
draw = ImageDraw.Draw(image)
for offset in (0, 90, 180):
    draw.arc((790 + offset, -260 + offset, 1550 + offset, 500 + offset), 70, 280, fill="#dedfe0", width=2)
logo = Image.open(ASSETS / "images/tityra-wordmark-source.png").convert("RGBA")
logo.thumbnail((170, 64), Image.Resampling.LANCZOS)
image.paste(logo, (80, 48), logo)
draw.line((80, 148, 1120, 148), fill="#cbd0d2", width=2)
draw.line((80, 212, 80, 411), fill="#555b60", width=5)
heading = font("fonts/philosopher/Philosopher-Regular.woff", 88)
body = font("fonts/noto/NotoSansTagalog-Regular.woff", 26)
small = font("fonts/noto/NotoSansTagalog-Regular.woff", 22)
draw.text((112, 201), "Agent readiness guides", font=font("fonts/philosopher/Philosopher-Regular.woff", 76), fill="#17191d")
draw.text((112, 301), "from Tityra", font=heading, fill="#17191d")
draw.text((112, 431), "Website content audits for better Agent Experience.", font=body, fill="#555b60")
draw.line((80, 528, 1120, 528), fill="#cbd0d2", width=2)
draw.text((80, 552), "Tityra", font=small, fill="#17191d")
draw.text((830, 552), "tityra-uk.github.io", font=small, fill="#555b60")
destination = ASSETS / "images/social-card.png"
image.save(destination, optimize=True)
print(destination)
