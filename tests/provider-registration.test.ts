import { describe, it, expect, beforeEach } from "vitest"

// Mock Clarity contract interaction
const providerRegistrationContract = {
  state: {
    providerCount: 0,
    providers: new Map(),
    principalToProvider: new Map(),
    authorizedVerifiers: new Map(),
    admin: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
  },
  
  // Constants
  STATUS_PENDING: 1,
  STATUS_VERIFIED: 2,
  STATUS_REJECTED: 3,
  
  // Error codes
  ERR_UNAUTHORIZED: 100,
  ERR_INVALID_PARAMS: 101,
  ERR_ALREADY_REGISTERED: 102,
  ERR_NOT_FOUND: 103,
  
  registerProvider(name, credentials, sender) {
    // Check if already registered
    if (this.state.principalToProvider.has(sender)) {
      return { error: this.ERR_ALREADY_REGISTERED }
    }
    
    const providerId = this.state.providerCount + 1
    const registrationDate = Math.floor(Date.now() / 1000)
    
    this.state.providers.set(providerId, {
      principal: sender,
      name,
      credentials,
      backgroundCheckDate: 0,
      backgroundCheckPassed: false,
      verificationStatus: this.STATUS_PENDING,
      registrationDate,
    })
    
    this.state.principalToProvider.set(sender, providerId)
    this.state.providerCount = providerId
    
    return { value: providerId }
  },
  
  addVerifier(verifier, sender) {
    if (sender !== this.state.admin) {
      return { error: this.ERR_UNAUTHORIZED }
    }
    
    this.state.authorizedVerifiers.set(verifier, true)
    return { value: true }
  },
  
  updateBackgroundCheck(providerId, checkDate, passed, sender) {
    if (!this.state.authorizedVerifiers.has(sender)) {
      return { error: this.ERR_UNAUTHORIZED }
    }
    
    if (!this.state.providers.has(providerId)) {
      return { error: this.ERR_NOT_FOUND }
    }
    
    const provider = this.state.providers.get(providerId)
    provider.backgroundCheckDate = checkDate
    provider.backgroundCheckPassed = passed
    
    this.state.providers.set(providerId, provider)
    return { value: true }
  },
  
  updateVerificationStatus(providerId, status, sender) {
    if (!this.state.authorizedVerifiers.has(sender)) {
      return { error: this.ERR_UNAUTHORIZED }
    }
    
    if (!this.state.providers.has(providerId)) {
      return { error: this.ERR_NOT_FOUND }
    }
    
    const provider = this.state.providers.get(providerId)
    provider.verificationStatus = status
    
    this.state.providers.set(providerId, provider)
    return { value: true }
  },
  
  getProvider(providerId) {
    return this.state.providers.get(providerId) || null
  },
  
  getProviderIdByPrincipal(principal) {
    return this.state.principalToProvider.get(principal) || null
  },
  
  isProviderVerified(providerId) {
    const provider = this.state.providers.get(providerId)
    if (!provider) return false
    return provider.verificationStatus === this.STATUS_VERIFIED
  },
}

describe("Provider Registration Contract", () => {
  const admin = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
  const verifier = "ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ"
  const provider = "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5"
  
  beforeEach(() => {
    // Reset state before each test
    providerRegistrationContract.state.providerCount = 0
    providerRegistrationContract.state.providers = new Map()
    providerRegistrationContract.state.principalToProvider = new Map()
    providerRegistrationContract.state.authorizedVerifiers = new Map()
    providerRegistrationContract.state.admin = admin
  })
  
  it("should register a new provider", () => {
    const credentials = ["Early Childhood Education Degree", "CPR Certified", "First Aid Training"]
    
    const result = providerRegistrationContract.registerProvider("Happy Kids Daycare", credentials, provider)
    
    expect(result).toHaveProperty("value")
    expect(result.value).toBe(1)
    
    const providerData = providerRegistrationContract.getProvider(1)
    expect(providerData).not.toBeNull()
    expect(providerData.name).toBe("Happy Kids Daycare")
    expect(providerData.credentials).toEqual(credentials)
    expect(providerData.verificationStatus).toBe(providerRegistrationContract.STATUS_PENDING)
    expect(providerData.backgroundCheckPassed).toBe(false)
  })
  
  it("should not allow duplicate provider registration", () => {
    const credentials = ["Early Childhood Education Degree"]
    
    // Register once
    providerRegistrationContract.registerProvider("Happy Kids Daycare", credentials, provider)
    
    // Try to register again
    const result = providerRegistrationContract.registerProvider("Another Name", credentials, provider)
    
    expect(result).toHaveProperty("error")
    expect(result.error).toBe(providerRegistrationContract.ERR_ALREADY_REGISTERED)
  })
  
  it("should allow admin to add verifiers", () => {
    const result = providerRegistrationContract.addVerifier(verifier, admin)
    
    expect(result).toHaveProperty("value")
    expect(result.value).toBe(true)
    expect(providerRegistrationContract.state.authorizedVerifiers.has(verifier)).toBe(true)
  })
  
  it("should allow verifiers to update background checks", () => {
    // Register a provider
    providerRegistrationContract.registerProvider("Happy Kids Daycare", ["Certification"], provider)
    
    // Add a verifier
    providerRegistrationContract.addVerifier(verifier, admin)
    
    // Update background check
    const checkDate = Math.floor(Date.now() / 1000)
    const result = providerRegistrationContract.updateBackgroundCheck(1, checkDate, true, verifier)
    
    expect(result).toHaveProperty("value")
    expect(result.value).toBe(true)
    
    const providerData = providerRegistrationContract.getProvider(1)
    expect(providerData.backgroundCheckDate).toBe(checkDate)
    expect(providerData.backgroundCheckPassed).toBe(true)
  })
  
  it("should allow verifiers to update verification status", () => {
    // Register a provider
    providerRegistrationContract.registerProvider("Happy Kids Daycare", ["Certification"], provider)
    
    // Add a verifier
    providerRegistrationContract.addVerifier(verifier, admin)
    
    // Update verification status
    const result = providerRegistrationContract.updateVerificationStatus(
        1,
        providerRegistrationContract.STATUS_VERIFIED,
        verifier,
    )
    
    expect(result).toHaveProperty("value")
    expect(result.value).toBe(true)
    
    const providerData = providerRegistrationContract.getProvider(1)
    expect(providerData.verificationStatus).toBe(providerRegistrationContract.STATUS_VERIFIED)
    expect(providerRegistrationContract.isProviderVerified(1)).toBe(true)
  })
})

