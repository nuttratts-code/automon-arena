// ตัวสุ่มแบบกำหนดเมล็ดได้ (ไม่ใช้ Math.random) · ใช้สุ่มทีมบอทและร้านค้า เพื่อให้จำลองซ้ำได้
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: n => Math.floor(next() * n), pick: arr => arr[Math.floor(next() * arr.length)] };
}

