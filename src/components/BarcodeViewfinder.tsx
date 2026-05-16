import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export function BarcodeViewfinder() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={styles.vfTop} />
      <View style={styles.vfMiddle}>
        <View style={styles.vfSide} />
        <View style={styles.vfWindow}>
          <View style={[styles.vfCorner, styles.vfCornerTL]} />
          <View style={[styles.vfCorner, styles.vfCornerTR]} />
          <View style={[styles.vfCorner, styles.vfCornerBL]} />
          <View style={[styles.vfCorner, styles.vfCornerBR]} />
        </View>
        <View style={styles.vfSide} />
      </View>
      <View style={styles.vfBottom}>
        <Text style={styles.vfLabel}>Point at barcode</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vfTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  vfMiddle: { flexDirection: 'row', height: 120 },
  vfSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  vfWindow: { width: 260 },
  vfBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: 12,
  },
  vfLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  vfCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#fff',
    borderWidth: 3,
  },
  vfCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  vfCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  vfCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  vfCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
});
