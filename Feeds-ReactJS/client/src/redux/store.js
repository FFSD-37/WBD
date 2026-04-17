import { configureStore } from '@reduxjs/toolkit';
import socketReducer from './slices/socketSlice.js';
import themeReducer from './slices/themeSlice.js';

export const store = configureStore({
  reducer: {
    socket: socketReducer,
    theme: themeReducer,
  },
});
