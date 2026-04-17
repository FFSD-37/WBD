import { createSlice } from '@reduxjs/toolkit';
import socket from '../../socket';

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    connected: false,
  },
  reducers: {
    connectSocket(state) {
      if (!state.connected) {
        socket.connect();
        state.connected = true;
      }
    },
    disconnectSocket(state) {
      if (state.connected) {
        socket.disconnect();
        state.connected = false;
      }
    },
  },
});

export const { connectSocket, disconnectSocket } = socketSlice.actions;
export default socketSlice.reducer;
