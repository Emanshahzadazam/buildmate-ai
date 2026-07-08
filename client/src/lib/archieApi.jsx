import api from "./api";

// Reuses the shared axios instance -> same baseURL + JWT auth header as the rest of the app
export const archieApi = {
  chat: (system, messages) =>
    api.post("/archie", { system, messages }).then((r) => r.data),
};
