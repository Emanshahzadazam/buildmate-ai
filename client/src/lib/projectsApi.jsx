import api from "./api";

export const projectsApi = {
  list: () => api.get("/projects").then((r) => r.data.projects),
  create: (payload) => api.post("/projects", payload).then((r) => r.data.project),
  get: (id) => api.get(`/projects/${id}`).then((r) => r.data.project),
  remove: (id) => api.delete(`/projects/${id}`),
};