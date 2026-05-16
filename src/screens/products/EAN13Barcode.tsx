import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { ean13ToBars } from '@/utils/barcode';

const MODULE_WIDTH = 2;
const QUIET_MODULES = 9;
const BAR_HEIGHT = 66;
const TOTAL_HEIGHT = 80;

interface Props {
  value: string;
  scale?: number;
}

export function EAN13Barcode({ value, scale = 1 }: Props) {
  const bars = ean13ToBars(value);
  const mw = MODULE_WIDTH * scale;
  const totalWidth = (bars.length + QUIET_MODULES * 2) * mw;
  const totalHeight = TOTAL_HEIGHT * scale;
  const barHeight = BAR_HEIGHT * scale;

  return (
    <Svg width={totalWidth} height={totalHeight}>
      <Rect width={totalWidth} height={totalHeight} fill="white" />
      {bars.split('').map((bit, i) =>
        bit === '1' ? (
          <Rect
            key={i}
            x={(i + QUIET_MODULES) * mw}
            y={0}
            width={mw}
            height={barHeight}
            fill="black"
          />
        ) : null,
      )}
      <SvgText
        x={totalWidth / 2}
        y={totalHeight * 0.96}
        textAnchor="middle"
        fontSize={10 * scale}
        fontFamily="monospace"
        fill="black"
      >
        {value}
      </SvgText>
    </Svg>
  );
}
