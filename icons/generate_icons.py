import struct
import zlib
import os

def create_png(width, height, color_func):
    # PNG signature
    png_data = bytearray(b'\x89PNG\r\n\x1a\n')

    # IHDR chunk
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr)
    png_data.extend(struct.pack('>I', 13) + b'IHDR' + ihdr + struct.pack('>I', ihdr_crc))

    # IDAT chunk (raw RGBA pixels)
    raw_rows = bytearray()
    for y in range(height):
        raw_rows.append(0) # Filter type 0
        for x in range(width):
            r, g, b, a = color_func(x, y, width, height)
            raw_rows.extend([r, g, b, a])

    compressed = zlib.compress(raw_rows)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png_data.extend(struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc))

    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    png_data.extend(struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc))

    return png_data

def render_teams_icon(x, y, w, h):
    # Normalized coordinates [-1, 1]
    nx = (x / w) * 2 - 1
    ny = (y / h) * 2 - 1
    dist_center = (nx**2 + ny**2)**0.5

    # Base rounded rect background (Teams Purple #6264A7)
    # Check rounded rect boundary
    corner_r = 0.3
    in_box = True
    if abs(nx) > (1 - corner_r) and abs(ny) > (1 - corner_r):
        cx = 1 - corner_r if nx > 0 else -(1 - corner_r)
        cy = 1 - corner_r if ny > 0 else -(1 - corner_r)
        if ((nx - cx)**2 + (ny - cy)**2)**0.5 > corner_r:
            in_box = False

    if not in_box:
        return (0, 0, 0, 0) # Transparent

    # Teams Purple gradient: #4F46E5 to #6264A7
    r = int(79 + (98 - 79) * (y / h))
    g = int(70 + (100 - 70) * (y / h))
    b = int(229 + (167 - 229) * (y / h))
    a = 255

    # Online Dot badge in bottom right (Emerald Green #10B981)
    badge_cx = 0.55
    badge_cy = 0.55
    badge_radius = 0.38
    dist_badge = ((nx - badge_cx)**2 + (ny - badge_cy)**2)**0.5

    if dist_badge <= badge_radius + 0.08:
        # Border white ring around badge
        r, g, b = 15, 23, 42
    if dist_badge <= badge_radius:
        # Emerald Green
        r, g, b = 16, 185, 129

    return (r, g, b, a)

icons_dir = "/Users/amanvermez/Development/teams-always-online-extension/icons"
os.makedirs(icons_dir, exist_ok=True)

for size in [16, 48, 128]:
    png_bytes = create_png(size, size, render_teams_icon)
    path = os.path.join(icons_dir, f"icon{size}.png")
    with open(path, "wb") as f:
        f.write(png_bytes)
    print(f"Generated {path} ({size}x{size})")
