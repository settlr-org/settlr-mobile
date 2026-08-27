import { Tabs } from 'expo-router';
import { colors } from '../../src/theme';
export default function TabsLayout() { return <Tabs screenOptions={{ headerShown:false, tabBarActiveTintColor:colors.teal, tabBarInactiveTintColor:colors.muted, tabBarStyle:{height:72,paddingTop:8,paddingBottom:12}, tabBarLabelStyle:{fontSize:12} }}><Tabs.Screen name="index" options={{title:'Home',tabBarAccessibilityLabel:'Home'}}/><Tabs.Screen name="groups" options={{title:'Groups'}}/><Tabs.Screen name="activity" options={{title:'Activity'}}/><Tabs.Screen name="account" options={{title:'Account'}}/></Tabs>; }
