/* eslint-disable prettier/prettier */
import { combineReducers } from '@reduxjs/toolkit';
import authReducer from 'feature/auth/authSlice';
import passwordReducer from 'feature/password/passwordSlice';
const rootReducer = combineReducers({
  auth: authReducer,
  password: passwordReducer,
});

export default rootReducer;