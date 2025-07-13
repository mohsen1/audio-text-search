declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username?: string
    }
  }

  interface User {
    id: string
    username?: string
    name?: string | null
    email?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string
  }
}