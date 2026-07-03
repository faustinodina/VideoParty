import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch, RootState } from "@/store";

// Pre-typed hooks — use these instead of plain useDispatch/useSelector so
// thunks and state are fully typed at call sites.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
