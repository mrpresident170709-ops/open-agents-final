import type { Session } from "./types";

export const LOCAL_USER_ID = "local-admin";

export const LOCAL_SESSION: Session = {
  created: 0,
  authProvider: "github",
  user: {
    id: LOCAL_USER_ID,
    username: "admin",
    email: undefined,
    avatar: "",
    name: "Admin",
  },
};
