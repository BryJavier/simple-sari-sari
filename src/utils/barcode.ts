const L_TABLE = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
];
const G_TABLE = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
];
const R_TABLE = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
];
// Parity pattern for the first (number-system) digit
const PARITY_PATTERN = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
];

export function ean13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(first12[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export function generateEAN13(): string {
  // Prefix '2' = internal-use range (200–299 first 3 digits)
  let body = '2';
  for (let i = 0; i < 11; i++) {
    body += Math.floor(Math.random() * 10).toString();
  }
  return body + ean13CheckDigit(body).toString();
}

export function isValidEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;
  return Number(barcode[12]) === ean13CheckDigit(barcode.slice(0, 12));
}

export function ean13ToBars(barcode: string): string {
  const first = Number(barcode[0]);
  const parity = PARITY_PATTERN[first] ?? 'LLLLLL';

  let bars = '101'; // start guard

  // Left 6 digits (barcode positions 1–6)
  for (let i = 0; i < 6; i++) {
    const digit = Number(barcode[i + 1]);
    const table = parity[i] === 'L' ? L_TABLE : G_TABLE;
    bars += table[digit] ?? '0000000';
  }

  bars += '01010'; // center guard

  // Right 6 digits (barcode positions 7–12)
  for (let i = 0; i < 6; i++) {
    const digit = Number(barcode[i + 7]);
    bars += R_TABLE[digit] ?? '0000000';
  }

  bars += '101'; // end guard

  return bars; // always 95 characters
}

export function generateBarcodeSVGString(value: string): string {
  const bars = ean13ToBars(value);
  const moduleWidth = 2;
  const quietModules = 9;
  const barHeight = 66;
  const totalHeight = 80;
  const totalWidth = (bars.length + quietModules * 2) * moduleWidth;

  const rects = bars
    .split('')
    .map((bit, i) => {
      if (bit !== '1') return '';
      const x = (i + quietModules) * moduleWidth;
      return `<rect x="${x}" y="0" width="${moduleWidth}" height="${barHeight}" fill="black"/>`;
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}">` +
    `<rect width="${totalWidth}" height="${totalHeight}" fill="white"/>` +
    rects +
    `<text x="${totalWidth / 2}" y="77" text-anchor="middle" font-size="10" font-family="monospace" fill="black">${value}</text>` +
    `</svg>`
  );
}
