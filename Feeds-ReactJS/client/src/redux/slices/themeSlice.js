import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  mode: 'Normal',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme(state, action) {
      state.mode = action.payload;
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
