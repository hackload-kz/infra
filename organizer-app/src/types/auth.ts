import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

// JWT module augmentation temporarily disabled due to module path issues
// declare module "next-auth/jwt" {
//   interface JWT {
//     role?: string;
//   }
// }