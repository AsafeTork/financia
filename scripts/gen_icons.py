import os, sys, subprocess, struct, zlib

HEX   = os.environ.get('HEX_COLOR', '002f59').lstrip('#')
r_,g_,b_ = int(HEX[0:2],16), int(HEX[2:4],16), int(HEX[4:6],16)
SIZES = {'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192}

has_logo = os.path.exists('/tmp/logo') and os.path.getsize('/tmp/logo') > 500

def make_dir(d, s):
    os.makedirs(f'android/app/src/main/res/mipmap-{d}', exist_ok=True)

# ── Caso 1: cliente tem logo → usar PIL ──────────────────────────────────────
if has_logo:
    try:
        from PIL import Image
        for d, s in SIZES.items():
            bg = Image.new('RGBA', (s, s), (r_, g_, b_, 255))
            logo = Image.open('/tmp/logo').convert('RGBA')
            pad = int(s * 0.14)
            inner = s - pad * 2
            logo = logo.resize((inner, inner), Image.LANCZOS)
            bg.paste(logo, (pad, pad), logo)
            make_dir(d, s)
            bg.save(f'android/app/src/main/res/mipmap-{d}/ic_launcher.png')
            print(f'{d} {s}x{s} (logo cliente)')
        sys.exit(0)
    except Exception as e:
        print(f'PIL error: {e}')

# ── Caso 2: sem logo → converter SVG default via rsvg-convert ────────────────
svg_path = 'icon-512.svg'
if os.path.exists(svg_path):
    # Tentar rsvg-convert (disponível no ubuntu-latest)
    for d, s in SIZES.items():
        out = f'android/app/src/main/res/mipmap-{d}/ic_launcher.png'
        make_dir(d, s)
        result = subprocess.run(
            ['rsvg-convert', '-w', str(s), '-h', str(s), svg_path, '-o', out],
            capture_output=True
        )
        if result.returncode == 0:
            size_kb = os.path.getsize(out) // 1024
            print(f'{d} {s}x{s} via rsvg-convert ({size_kb}KB)')
        else:
            # Tentar ImageMagick convert
            result2 = subprocess.run(
                ['convert', '-background', 'none', '-resize', f'{s}x{s}', svg_path, out],
                capture_output=True
            )
            if result2.returncode == 0:
                print(f'{d} {s}x{s} via ImageMagick')
            else:
                print(f'{d} {s}x{s} fallback cor solida')
                # Fallback: PNG sólido com a cor da marca
                def chunk(t,d_):
                    c=struct.pack('>I',len(d_))+t+d_
                    return c+struct.pack('>I',zlib.crc32(t+d_)&0xffffffff)
                raw=b''.join(b'\x00'+bytes([r_,g_,b_]*s) for _ in range(s))
                png=(b'\x89PNG\r\n\x1a\n'
                    +chunk(b'IHDR',struct.pack('>IIBBBBB',s,s,8,2,0,0,0))
                    +chunk(b'IDAT',zlib.compress(raw))
                    +chunk(b'IEND',b''))
                with open(out,'wb') as f: f.write(png)
else:
    print('SVG nao encontrado — gerando cor solida')
