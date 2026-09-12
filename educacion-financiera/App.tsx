import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import EducacionFinancieraScreen from './screens/EducacionFinancieraScreen';
import HomeScreen from './screens/HomeScreen';

export type RootStackParamList = {
  Home: undefined;
  EducacionFinanciera: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Home' }}
        />
        <Stack.Screen
          name="EducacionFinanciera"
          component={EducacionFinancieraScreen}
          options={{ title: 'Educación Financiera' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
