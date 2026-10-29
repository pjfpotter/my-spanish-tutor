"""Generate placeholder PWA icons. Replace with real artwork before launch."""
from PIL import Image, ImageDraw

BG, FG = (194, 65, 12), (255, 247, 237)


def icon(size, circle_ratio):
    img = Image.new('RGB', (size, size), BG)
    r = size * circle_ratio / 2
    c = size / 2
    ImageDraw.Draw(img).ellipse((c - r, c - r, c + r, c + r), fill=FG)
    return img


for name, size, ratio in [
    ('icon-192', 192, 0.62),
    ('icon-512', 512, 0.62),
    ('icon-maskable-512', 512, 0.5),  # inside the maskable safe zone
    ('apple-touch-icon', 180, 0.62),
]:
    icon(size, ratio).save(f'public/icons/{name}.png')
