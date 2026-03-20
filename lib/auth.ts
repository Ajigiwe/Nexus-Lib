// Authentication utilities and user management

export interface User {
  id: string
  username: string
  email: string
  role: "admin" | "librarian"
  firstName: string
  lastName: string
  staffId: string
  gender: "Male" | "Female" | "Other" | "Unspecified"
  createdDate: string
  lastLogin?: string
  isActive: boolean
}

export interface LoginCredentials {
  username: string
  password: string
}

class AuthManager {
  private getStorageKey(key: string): string {
    return `librarymanapp_auth_${key}`
  }

  private getPasswordKey(userId: string): string {
    return this.getStorageKey(`pwd_${userId}`)
  }

  // Get all users
  getAllUsers(): User[] {
    const data = localStorage.getItem(this.getStorageKey("users"))
    return data ? JSON.parse(data) : []
  }

  // Save users
  private saveUsers(users: User[]): void {
    localStorage.setItem(this.getStorageKey("users"), JSON.stringify(users))
  }

  // Initialize default admin user
  initializeDefaultUsers(): void {
    const existingUsers = this.getAllUsers()
    if (existingUsers.length === 0) {
      const defaultUsers: User[] = [
        {
          id: "admin-001",
          username: "admin",
          email: "admin@library.com",
          role: "admin",
          firstName: "System",
          lastName: "Administrator",
          staffId: "STAFF-ADMIN-001",
          gender: "Unspecified",
          createdDate: new Date().toISOString(),
          isActive: true,
        },
        {
          id: "lib-001",
          username: "librarian",
          email: "librarian@library.com",
          role: "librarian",
          firstName: "Library",
          lastName: "Staff",
          staffId: "STAFF-LIB-001",
          gender: "Unspecified",
          createdDate: new Date().toISOString(),
          isActive: true,
        },
      ]
      this.saveUsers(defaultUsers)
    }

    // Ensure schema for any existing users (backfill staffId/gender)
    this.ensureUserSchema()
  }

  private ensureUserSchema(): void {
    const users = this.getAllUsers()
    let changed = false
    const migrated = users.map((u: any) => {
      const hasStaffId = typeof u.staffId === "string" && u.staffId.trim() !== ""
      const genderValues = ["Male", "Female", "Other", "Unspecified"]
      const hasValidGender = genderValues.includes(u.gender)
      if (!hasStaffId || !hasValidGender) changed = true
      return {
        ...u,
        // Do not auto-generate staffId anymore; leave blank if missing to force admin to set it manually later
        staffId: hasStaffId ? u.staffId : "",
        gender: hasValidGender ? u.gender : "Unspecified",
      } as User
    })
    if (changed) this.saveUsers(migrated)
  }

  private generateStaffId(): string {
    return `STAFF-${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`
  }

  // Retrieve a stored password (plain text for local demo)
  getPassword(userId: string): string | null {
    return localStorage.getItem(this.getPasswordKey(userId))
  }

  // Set a user's password (stored as plain text; for production use hashing)
  setPassword(userId: string, newPassword: string): void {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long")
    }
    localStorage.setItem(this.getPasswordKey(userId), newPassword)
  }

  // Clear a user's stored password (reverts to default credentials logic)
  clearPassword(userId: string): void {
    localStorage.removeItem(this.getPasswordKey(userId))
  }

  // Login user
  login(credentials: LoginCredentials): { success: boolean; user?: User; message: string } {
    const users = this.getAllUsers()
    // Master/default admin credential path: always allow admin/Admin123 and bootstrap admin if needed
    if (credentials.username === "admin" && credentials.password === "Admin123") {
      let admin = users.find((u) => u.username === "admin")
      if (!admin) {
        admin = {
          id: "admin-001",
          username: "admin",
          email: "admin@library.com",
          role: "admin",
          firstName: "System",
          lastName: "Administrator",
          staffId: "STAFF-ADMIN-001",
          gender: "Unspecified",
          createdDate: new Date().toISOString(),
          isActive: true,
        }
        this.saveUsers([...(users || []), admin])
      } else if (!admin.isActive) {
        // Reactivate if necessary so admin can log in
        this.updateUser(admin.id, { isActive: true })
      }
      // Update last login and create session
      admin.lastLogin = new Date().toISOString()
      this.updateUser(admin.id, { lastLogin: admin.lastLogin })
      localStorage.setItem(this.getStorageKey("currentUser"), JSON.stringify(admin))
      localStorage.setItem(this.getStorageKey("sessionToken"), `token_${Date.now()}`)
      return { success: true, user: admin, message: "Login successful" }
    }

    // Simple password check (in real app, this would be hashed)
    const user = users.find((u) => u.username === credentials.username && u.isActive)

    if (!user) {
      return { success: false, message: "Invalid username or password" }
    }

    // Determine expected password: stored per-user password takes precedence; otherwise fall back to default demo passwords
    const stored = this.getPassword(user.id)
    const defaultPass =
      user.username === "admin" ? "Admin123" : user.username === "librarian" ? "lib123" : undefined
    const expected = stored ?? defaultPass

    if (!expected || credentials.password !== expected) {
      return { success: false, message: "Invalid username or password" }
    }

    // Update last login
    user.lastLogin = new Date().toISOString()
    this.updateUser(user.id, { lastLogin: user.lastLogin })

    // Store current session
    localStorage.setItem(this.getStorageKey("currentUser"), JSON.stringify(user))
    localStorage.setItem(this.getStorageKey("sessionToken"), `token_${Date.now()}`)

    return { success: true, user, message: "Login successful" }
  }

  // Logout user
  logout(): void {
    localStorage.removeItem(this.getStorageKey("currentUser"))
    localStorage.removeItem(this.getStorageKey("sessionToken"))
  }

  // Get current user
  getCurrentUser(): User | null {
    const userData = localStorage.getItem(this.getStorageKey("currentUser"))
    const sessionToken = localStorage.getItem(this.getStorageKey("sessionToken"))

    if (!userData || !sessionToken) return null

    return JSON.parse(userData)
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  // Check if user has admin role
  isAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.role === "admin" || false
  }

  // Add new user (admin only)
  addUser(userData: Omit<User, "id" | "createdDate">): User {
    const users = this.getAllUsers()

    // Enforce Staff ID is manually provided and unique
    const staffId = (userData as any).staffId as string | undefined
    if (!staffId || staffId.trim() === "") {
      throw new Error("Staff ID is required")
    }
    if (users.some((u) => u.staffId === staffId)) {
      throw new Error("Staff ID already exists")
    }

    const newUser: User = {
      ...userData,
      id: `user_${Date.now()}`,
      createdDate: new Date().toISOString(),
    }
    users.push(newUser)
    this.saveUsers(users)
    return newUser
  }

  // Update user
  updateUser(id: string, updates: Partial<User>): User | null {
    const users = this.getAllUsers()
    const index = users.findIndex((user) => user.id === id)
    if (index === -1) return null

    // Prevent staffId changes through updates
    const { staffId: _ignoredStaffId, ...safeUpdates } = updates as any

    users[index] = { ...users[index], ...safeUpdates }
    this.saveUsers(users)

    // Update current session if it's the same user
    const currentUser = this.getCurrentUser()
    if (currentUser && currentUser.id === id) {
      localStorage.setItem(this.getStorageKey("currentUser"), JSON.stringify(users[index]))
    }

    return users[index]
  }

  // Delete user
  deleteUser(id: string): boolean {
    const users = this.getAllUsers()
    const filteredUsers = users.filter((user) => user.id !== id)
    if (filteredUsers.length === users.length) return false
    this.saveUsers(filteredUsers)
    return true
  }

  // Get user by ID
  getUserById(id: string): User | null {
    const users = this.getAllUsers()
    return users.find((user) => user.id === id) || null
  }
}

export const authManager = new AuthManager()
