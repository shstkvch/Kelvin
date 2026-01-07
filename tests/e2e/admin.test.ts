import { test, expect } from '@playwright/test';

test.describe('Admin UI', () => {
  test.beforeEach(async ({ request }) => {
    // Clean up database by registering fresh user if needed
  });

  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/admin');

    // Should redirect to login
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator('h1')).toContainText('Admin');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('can login and see admin dashboard', async ({ page, request }) => {
    // Register a user via API first
    const registerRes = await request.post('/auth/register', {
      data: {
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test User',
        role: 'admin',
      },
    });
    expect(registerRes.ok()).toBeTruthy();

    const { data: user } = await registerRes.json();

    // Go to login page
    await page.goto('/admin/login');

    // Fill in credentials
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to first view
    await expect(page).toHaveURL(/\/admin\/blog/);

    // Should see navigation
    await expect(page.locator('nav')).toContainText('Blog');
  });

  test('shows list of posts', async ({ page, request }) => {
    // Register admin user
    const email = `admin${Date.now()}@example.com`;
    const registerRes = await request.post('/auth/register', {
      data: {
        email,
        password: 'password123',
        name: 'Admin',
        role: 'admin',
      },
    });
    const { token } = await registerRes.json();

    // Create a post via API
    await request.post('/api/author/post', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'Test Post',
        slug: `test-post-${Date.now()}`,
        body: 'Test content',
      },
    });

    // Login via UI
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to author view (shows drafts, not just published)
    await page.goto('/admin/author/post');

    // Should see the post in the table
    await expect(page.locator('table')).toContainText('Test Post');
  });

  test('can logout', async ({ page, request }) => {
    // Register and login
    const email = `logout${Date.now()}@example.com`;
    await request.post('/auth/register', {
      data: {
        email,
        password: 'password123',
        name: 'Test',
        role: 'admin',
      },
    });

    await page.goto('/admin/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/admin\/blog/);

    // Click logout
    await page.click('a:has-text("Logout")');

    // Should be back at login
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
