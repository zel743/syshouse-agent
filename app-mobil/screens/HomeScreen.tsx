import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { RootStackParamList } from '../App';
import { login } from '../services/api';
import { saveSession } from '../services/session';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Escribe tu usuario y contraseña.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const session = await login(username.trim(), password);
      await saveSession(session);
      navigation.replace('EducacionFinancieraMenu', { usuario: session });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brandBlock}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <Text style={styles.eyebrow}>BANORTE</Text>
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>Accede a tu espacio de Educación Financiera</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Inicia sesión</Text>

          <Text style={styles.label}>Nombre de usuario</Text>
          <TextInput
            style={styles.input}
            placeholder="Escribe tu usuario"
            placeholderTextColor="#9B8585"
            value={username}
            onChangeText={(value) => {
              setUsername(value);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Escribe tu contraseña"
            placeholderTextColor="#9B8585"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError('');
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>

          <Text style={styles.demoText}>Demo: Luis / banorte2026</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#B5121B',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  logoText: {
    color: '#B5121B',
    fontSize: 32,
    fontWeight: '800',
  },
  eyebrow: {
    color: '#FFD9D9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: '#FFECEC',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#5E0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  formTitle: {
    color: '#321515',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    color: '#573B3B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E7CDCD',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#321515',
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FFFBFB',
  },
  error: {
    color: '#B5121B',
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: '#B5121B',
    marginTop: 4,
  },
  buttonPressed: {
    backgroundColor: '#8F0E15',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  demoText: {
    color: '#9B8585',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
  },
});
