import { createContext, useContext } from "react";
import { type PlayerContextType } from "../contexts/PlayerContext";

export const PlayerContext = createContext<PlayerContextType | undefined>(
  undefined
);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};
