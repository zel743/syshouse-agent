import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'EducacionFinanciera'>;

export default function EducacionFinancieraScreen({ route }: Props) {
  const { usuario } = route.params;

  return (
    <View style={styles.container}>
      <Text>Aquí va Educación Financiera para {usuario.nombre}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
