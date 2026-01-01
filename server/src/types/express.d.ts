declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string
        sessionId: string
      }
    }
  }
}

export {}
