import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'EducacionFinancieraMenu'>;

export default function EducacionFinancieraMenuScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => navigation.navigate('EducacionFinanciera')}
      >
        <Text style={styles.buttonText}>Educación Financiera</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFF8F8',
  },
  button: {
    width: '100%',
    maxWidth: 320,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#B5121B',
    paddingHorizontal: 20,
  },
  buttonPressed: {
    backgroundColor: '#8F0E15',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
