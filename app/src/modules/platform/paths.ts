import path from "node:path";

// Where the database, the session secret and uploaded photos live. Defaults to ./data; set DATA_DIR
// to put them elsewhere (a Docker volume, or a throwaway folder in tests).
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
