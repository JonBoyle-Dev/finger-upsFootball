import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import GameCanvas from './src/components/GameCanvas';

export default function App() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <GameCanvas />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a6b3c',
  },
});
