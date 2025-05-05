/* eslint-disable prettier/prettier */
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from './rootReducer'
// import logger from 'redux-logger'

export const store = configureStore({
    reducer: rootReducer,
    // middleware: getDefaultMiddleware => getDefaultMiddleware().concat(logger),
    devTools: process.env.NODE_ENV !== 'production'
})
export type RootState = ReturnType<typeof store.getState>; // Add this line
export type AppDispatch = typeof store.dispatch;
