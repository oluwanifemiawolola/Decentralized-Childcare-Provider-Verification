;; Provider Registration Contract
;; Records credentials and background checks for childcare providers

;; Define error codes
(define-constant ERR_UNAUTHORIZED u100)
(define-constant ERR_ALREADY_REGISTERED u101)
(define-constant ERR_NOT_FOUND u102)

;; Define verification status
(define-constant STATUS_PENDING u1)
(define-constant STATUS_VERIFIED u2)
(define-constant STATUS_REJECTED u3)

;; Define data structure for provider registration
(define-map providers
  {provider-id: uint}
  {
    name: (string-utf8 50),
    credentials: (string-utf8 100),
    background-check-passed: bool,
    verification-status: uint
  }
)

;; Map principal to provider ID
(define-map principal-to-provider principal uint)

;; Track provider count
(define-data-var provider-count uint u0)

;; Admin principal
(define-data-var admin principal tx-sender)

;; Authorized verifiers
(define-map verifiers principal bool)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin)))

;; Check if caller is verifier
(define-private (is-verifier)
  (default-to false (map-get? verifiers tx-sender)))

;; Add a verifier (admin only)
(define-public (add-verifier (verifier principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (ok (map-set verifiers verifier true))))

;; Register as a childcare provider
(define-public (register-provider
                (name (string-utf8 50))
                (credentials (string-utf8 100)))
  (let ((provider-id (+ (var-get provider-count) u1)))
    (asserts! (is-none (map-get? principal-to-provider tx-sender)) (err ERR_ALREADY_REGISTERED))

    ;; Store provider data
    (map-set providers
             {provider-id: provider-id}
             {
               name: name,
               credentials: credentials,
               background-check-passed: false,
               verification-status: STATUS_PENDING
             })

    ;; Map principal to provider ID
    (map-set principal-to-provider tx-sender provider-id)

    ;; Increment provider count
    (var-set provider-count provider-id)

    (ok provider-id)))

;; Update provider verification (verifier only)
(define-public (verify-provider
                (provider-id uint)
                (background-check-passed bool)
                (status uint))
  (begin
    (asserts! (is-verifier) (err ERR_UNAUTHORIZED))
    (asserts! (is-some (map-get? providers {provider-id: provider-id})) (err ERR_NOT_FOUND))

    ;; Update provider data
    (match (map-get? providers {provider-id: provider-id})
      provider
      (ok (map-set providers
                   {provider-id: provider-id}
                   {
                     name: (get name provider),
                     credentials: (get credentials provider),
                     background-check-passed: background-check-passed,
                     verification-status: status
                   }))
      (err ERR_NOT_FOUND))))

;; Get provider details
(define-read-only (get-provider (provider-id uint))
  (map-get? providers {provider-id: provider-id}))

;; Get provider ID by principal
(define-read-only (get-provider-id (provider-principal principal))
  (map-get? principal-to-provider provider-principal))

;; Check if provider is verified
(define-read-only (is-provider-verified (provider-id uint))
  (match (map-get? providers {provider-id: provider-id})
    provider (is-eq (get verification-status provider) STATUS_VERIFIED)
    false))

