import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../App';
import { clearSession } from '../services/session';

type Props = NativeStackScreenProps<RootStackParamList, 'EducacionFinancieraMenu'>;

export default function EducacionFinancieraMenuScreen({ navigation, route }: Props) {
  const { usuario } = route.params;

  const handleLogout = async () => {
    await clearSession();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => navigation.navigate('EducacionFinanciera', { usuario })}
      >
        <Text style={styles.buttonText}>Educación Financiera</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
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
  logoutButton: {
    width: '100%',
    maxWidth: 320,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B5121B',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  logoutButtonPressed: {
    backgroundColor: '#F5E2E2',
  },
  logoutButtonText: {
    color: '#B5121B',
    fontSize: 15,
    fontWeight: '700',
  },
});
