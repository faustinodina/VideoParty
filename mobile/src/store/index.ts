import { configureStore } from "@reduxjs/toolkit";

import partyReducer from "./partySlice";

export const store = configureStore({
  reducer: {
    party: partyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
