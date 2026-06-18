export function generateCode128Svg(text: string, height = 50, factor = 1.5): string {
  // Code 128 patterns for B start, stop, and standard ascii characters (32 to 126)
  const data = "212222222122222221121223121322131222122213122312132212221213221312231212112232122132122231113222123122123221223211221132221231213212223112312131311222321122321221312212322112322211212123212321232121111323131123131321112313132113132311211313231113231311112133112331132131113123113321133121313121211331231131213113213311213131311123311321331121312113312311332111314111221411431111111224111422121124121421141122141221112214112412122114122411142112142211241211221114413111241112134111111242121142121241114212124112124211411212421112421211212141214121412121111143111341131141114113114311411113411311113141114131311141411131"
    .match(/\d{6}/g) || [];

  const lookup: Record<string, [number, string]> = {};
  for (let i = 32; i < 127; i++) {
    lookup[String.fromCharCode(i)] = [i - 32, data[i - 32]];
  }

  let svgContent = "";
  let x = 10 * factor;
  let sum = 104;

  const draw = (pattern: string) => {
    pattern.split("").forEach((nStr, idx) => {
      const n = parseInt(nStr, 10);
      if (idx % 2 === 0) {
        // Draw black bar (even indices are bars, odd are spaces)
        svgContent += `<rect x="${x}" y="0" width="${n * factor}" height="${height}" fill="black" />\n`;
      }
      x += n * factor;
    });
  };

  // Start Code B
  draw("211214");

  // Data characters
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const l = lookup[char] || [0, ""];
    sum += l[0] * (i + 1);
    draw(l[1]);
  }

  // Check character
  draw(data[sum % 103]);

  // Stop character & quiet zone space (represented by final '9' which doesn't draw a bar)
  draw("23311129");

  const totalWidth = x + 10 * factor;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}">${svgContent}</svg>`;
}

export function generateCode128DataUri(text: string, height = 50, factor = 1.5): string {
  const svg = generateCode128Svg(text, height, factor);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
