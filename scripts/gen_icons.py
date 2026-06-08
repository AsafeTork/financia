import os, sys, struct, zlib

hex_c = os.environ.get('HEX_COLOR','002f59').lstrip('#')
r,g,b = int(hex_c[0:2],16),int(hex_c[2:4],16),int(hex_c[4:6],16)
sizes = {'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192}
has_logo = os.path.exists('/tmp/logo') and os.path.getsize('/tmp/logo')>100

try:
    from PIL import Image
    for d,s in sizes.items():
        bg = Image.new('RGBA',(s,s),(r,g,b,255))
        if has_logo:
            try:
                logo = Image.open('/tmp/logo').convert('RGBA')
                pad = int(s*0.14)
                inner = s - pad*2
                logo = logo.resize((inner,inner),Image.LANCZOS)
                bg.paste(logo,(pad,pad),logo)
            except: pass
        out = f'android/app/src/main/res/mipmap-{d}/ic_launcher.png'
        os.makedirs(os.path.dirname(out),exist_ok=True)
        bg.save(out)
        print(f'{d} {s}x{s} OK')
except Exception as e:
    print(f'PIL error: {e}')
    def chunk(t,d):
        c=struct.pack('>I',len(d))+t+d
        return c+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    def mkpng(sz):
        raw=b''.join(b'\x00'+bytes([r,g,b]*sz) for _ in range(sz))
        return (b'\x89PNG\r\n\x1a\n'
                +chunk(b'IHDR',struct.pack('>IIBBBBB',sz,sz,8,2,0,0,0))
                +chunk(b'IDAT',zlib.compress(raw))
                +chunk(b'IEND',b''))
    for d,sz in sizes.items():
        out=f'android/app/src/main/res/mipmap-{d}/ic_launcher.png'
        os.makedirs(os.path.dirname(out),exist_ok=True)
        with open(out,'wb') as f: f.write(mkpng(sz))
        print(f'{d} {sz}x{sz} fallback')
