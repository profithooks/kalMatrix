// import { create } from "zustand";

// const TOKEN_KEY = "hamza_token";
// const USER_KEY = "hamza_user";

// function loadInitialAuth() {
//   try {
//     const token = localStorage.getItem(TOKEN_KEY);
//     const rawUser = localStorage.getItem(USER_KEY);
//     const user = rawUser ? JSON.parse(rawUser) : null;
//     return {
//       token: token || null,
//       user: user || null,
//     };
//   } catch {
//     return { token: null, user: null };
//   }
// }

// export const useAuthStore = create((set) => ({
//   ...loadInitialAuth(),

//   login: (token, user) => {
//     console.log('login res', token, user)
//     try {
//       localStorage.setItem(TOKEN_KEY, token);
//       localStorage.setItem(USER_KEY, JSON.stringify(user));
//     } catch {
//       // ignore storage errors
//     }
//     set({ token, user });
//   },

//   logout: () => {
//     try {
//       localStorage.removeItem(TOKEN_KEY);
//       localStorage.removeItem(USER_KEY);
//     } catch {
//       // ignore
//     }
//     set({ token: null, user: null });
//   },
// }));
// src/store/authStore.js
import { create } from "zustand";

const TOKEN_KEY = "hamza_token";
const USER_KEY = "hamza_user";

function decodeWorkspaceIdFromToken(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4); // pad for atob

    const json = atob(padded);
    const data = JSON.parse(json);

    // Your backend JWT payload example:
    // { userId: "...", workspaceId: "..." , iat, exp }
    return data.workspaceId || null;
  } catch (e) {
    console.warn("Failed to decode workspaceId from token", e);
    return null;
  }
}

function loadInitialAuth() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    const user = rawUser ? JSON.parse(rawUser) : null;

    const workspaceId = token ? decodeWorkspaceIdFromToken(token) : null;

    return {
      token: token || null,
      user: user || null,
      workspaceId,
    };
  } catch {
    return { token: null, user: null, workspaceId: null };
  }
}

export const useAuthStore = create((set) => ({
  ...loadInitialAuth(),

  login: (token, user) => {
    console.log("login res", token, user);

    let workspaceId = decodeWorkspaceIdFromToken(token);

    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // ignore storage errors
    }

    set({ token, user, workspaceId });
  },

  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
    set({ token: null, user: null, workspaceId: null });
  },
}));
