import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Root: NavigatorScreenParams<BottomTabParamList>;
};

export type BottomTabParamList = {
  Home: undefined;
  MyBar: undefined;
  CustomMix: undefined;
  Archive: undefined;
};