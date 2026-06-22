import os, sys, struct, zlib

HEX = os.environ.get('HEX_COLOR', '002f59').lstrip('#')
r_ = int(HEX[0:2], 16)
g_ = int(HEX[2:4], 16)
b_ = int(HEX[4:6], 16)

LOGO_PATH = '/tmp/logo'
OUT_PATH = 'electron/icon.ico'
SIZES = [16, 32, 48, 256]

has_logo = os.path.exists(LOGO_PATH) and os.path.getsize(LOGO_PATH) > 500


def make_solid_png(size, r, g, b):
    def png_chunk(name, data):
        c = zlib.crc32(name + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = png_chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))

    raw = b''
    for _ in range(size):
        raw += b'\x00' + bytes([r, g, b]) * size
    comp = zlib.compress(raw)
    idat = png_chunk(b'IDAT', comp)
    iend = png_chunk(b'IEND', b'')
    return sig + ihdr + idat + iend


def make_logo_png(size, logo_path):
    from PIL import Image
    import io
    logo = Image.open(logo_path).convert('RGBA')
    logo = logo.resize((size, size), Image.LANCZOS)
    bg = Image.new('RGBA', (size, size), (r_, g_, b_, 255))
    bg.paste(logo, (0, 0), logo)
    buf = io.BytesIO()
    bg.convert('RGB').save(buf, 'PNG')
    return buf.getvalue()


def build_ico(png_list):
    count = len(png_list)
    header = struct.pack('<HHH', 0, 1, count)
    offset = 6 + count * 16
    directory = b''
    data_blobs = b''

    for size, png_data in png_list:
        w = h = size if size < 256 else 0
        directory += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(png_data), offset)
        offset += len(png_data)
        data_blobs += png_data

    return header + directory + data_blobs


os.makedirs('electron', exist_ok=True)

png_list = []
for s in SIZES:
    if has_logo:
        try:
            png_data = make_logo_png(s, LOGO_PATH)
            print(f'{s}x{s} logo')
        except Exception as e:
            print(f'{s}x{s} fallback (PIL error: {e})')
            png_data = make_solid_png(s, r_, g_, b_)
    else:
        png_data = make_solid_png(s, r_, g_, b_)
        print(f'{s}x{s} solid #{HEX}')
    png_list.append((s, png_data))

with open(OUT_PATH, 'wb') as f:
    f.write(build_ico(png_list))

print(f'ICO gerado: {OUT_PATH} ({os.path.getsize(OUT_PATH)} bytes)')
