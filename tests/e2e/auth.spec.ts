import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should redirect to login page when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('should show login form with email and password fields', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should show OAuth login buttons', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /github/i })).toBeVisible()
  })

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login')
    
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL('/signup')
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()
  })

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login')
    
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should show validation errors
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test('should show signup form with required fields', async ({ page }) => {
    await page.goto('/signup')
    
    await expect(page.getByLabel(/name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
    
    // Should show company options
    await expect(page.getByText(/create new company/i)).toBeVisible()
    await expect(page.getByText(/join existing company/i)).toBeVisible()
  })

  test('should validate password confirmation', async ({ page }) => {
    await page.goto('/signup')
    
    await page.getByLabel(/^password$/i).fill('password123')
    await page.getByLabel(/confirm password/i).fill('different123')
    
    await page.getByRole('button', { name: /create account/i }).click()
    
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('should show company creation form', async ({ page }) => {
    await page.goto('/signup')
    
    await page.getByRole('button', { name: /create new company/i }).click()
    
    await expect(page.getByLabel(/company name/i)).toBeVisible()
    await expect(page.getByLabel(/industry/i)).toBeVisible()
  })

  test('should show company join form', async ({ page }) => {
    await page.goto('/signup')
    
    await page.getByRole('button', { name: /join existing company/i }).click()
    
    await expect(page.getByLabel(/invitation code/i)).toBeVisible()
    await expect(page.getByLabel(/employee code/i)).toBeVisible()
  })

  test('should handle login attempt with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should show error message (exact message depends on Supabase error)
    await expect(page.locator('[role="alert"]')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.goto('/login')
    
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    
    // Form should be properly sized for mobile
    const form = page.locator('form')
    const boundingBox = await form.boundingBox()
    expect(boundingBox?.width).toBeLessThanOrEqual(375)
  })
})