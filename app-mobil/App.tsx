import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text } from 'react-native';
import EducacionFinancieraScreen from './screens/EducacionFinancieraScreen';
import EducacionFinancieraMenuScreen from './screens/EducacionFinancieraMenuScreen';
import HomeScreen from './screens/HomeScreen';
import type { LoginResponse } from './services/api';

export type RootStackParamList = {
  Home: undefined;
  EducacionFinancieraMenu: { usuario: LoginResponse };
  EducacionFinanciera: { usuario: LoginResponse };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const renderUsernameHeader = (nombre: string) => () => (
  <Text style={styles.headerUsername}>{nombre}</Text>
);

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="EducacionFinancieraMenu"
          component={EducacionFinancieraMenuScreen}
          options={({ route }) => ({
            title: 'Inicio',
            headerRight: renderUsernameHeader(route.params.usuario.nombre),
          })}
        />
        <Stack.Screen
          name="EducacionFinanciera"
          component={EducacionFinancieraScreen}
          options={({ route }) => ({
            title: 'Educación Financiera',
            headerRight: renderUsernameHeader(route.params.usuario.nombre),
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerUsername: {
    marginRight: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#573B3B',
  },
});
