import wave, os, numpy as np

tmp = os.path.join(os.environ['TEMP'], 'ikc-audio')
root = r"E:\03_Project\Deepseek Harness插件开发\dsh-ikunchick-pet"
assets = os.path.join(root, 'assets')

def load(path):
    with wave.open(path, 'rb') as w:
        n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels(); sw = w.getsampwidth()
        raw = w.readframes(n)
    if sw != 2:
        raise SystemExit('expected 16-bit, got ' + str(sw))
    data = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if ch == 2:
        data = data.reshape(-1, 2).mean(axis=1)
    return data, sr

def trim(x, sr, thresh=0.012, pad=0.02):
    idx = np.where(np.abs(x) > thresh)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * sr)); b = min(len(x), idx[-1] + int(pad * sr))
    return x[a:b]

def resample(x, factor):
    # factor>1 => faster & higher (chipmunk); factor<1 => slower & lower
    n_out = max(1, int(len(x) / factor))
    xi = np.linspace(0, len(x) - 1, n_out)
    return np.interp(xi, np.arange(len(x)), x)

def normalize(x, peak=0.92):
    m = np.max(np.abs(x))
    if m > 1e-6:
        x = x * (peak / m)
    return np.clip(x, -1.0, 1.0)

def fade(x, sr, ms=6):
    n = max(1, int(sr * ms / 1000))
    if len(x) > 2 * n:
        x[:n] *= np.linspace(0, 1, n)
        x[-n:] *= np.linspace(1, 0, n)
    return x

def save(path, x, sr):
    x16 = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(x16.tobytes())
    print(os.path.basename(path), f"{len(x)/sr:.2f}s", f"{os.path.getsize(path)/1024:.1f}KB")

# Kunkun
k, sr = load(os.path.join(tmp, 'kun-raw.wav'))
k = trim(k, sr)
dur = len(k) / sr
speed = 1.0
if dur > 1.75:
    speed = min(1.7, dur / 1.75)
k = resample(k, speed); k = normalize(k); k = fade(k, sr)
save(os.path.join(assets, 'click-kun.wav'), k, sr)
print('  kun speed', round(speed, 2))

# Nailong laugh: chipmunk up
n, sr = load(os.path.join(tmp, 'nailong-raw.wav'))
n = trim(n, sr)
n = resample(n, 1.35); n = normalize(n, 0.9); n = fade(n, sr)
save(os.path.join(assets, 'click-nailong.wav'), n, sr)
