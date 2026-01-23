import { test, expect } from '@playwright/test';

test.describe('Shikbo AI E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
    });

    test('should load the main page', async ({ page }) => {
        await expect(page).toHaveTitle(/Shikbo AI/);
        await expect(page.locator('text=Shikbo AI')).toBeVisible();
        await expect(page.locator('text=Your Virtual Tutor')).toBeVisible();
    });

    test('should allow sending a message', async ({ page }) => {
        const input = page.locator('textarea[placeholder*="Ask anything"]').first();
        await input.fill('Hello, can you help me with math?');
        await page.locator('button[type="button"]').filter({ hasText: 'Send' }).click();

        // Wait for response
        await expect(page.locator('text=Thinking...')).toBeVisible();
        await page.waitForTimeout(2000); // Wait for AI response
    });

    test('should switch languages', async ({ page }) => {
        // Open settings dropdown
        await page.locator('button').filter({ has: page.locator('[data-slot="settings"]') }).click();

        // Click Bengali option
        await page.locator('text=বাংলা').click();

        // Check if title changed to Bengali
        await expect(page.locator('text=শিখবো এআই')).toBeVisible();
    });

    test('should handle voice input', async ({ page }) => {
        // Mock speech recognition
        await page.addScriptTag({
            content: `
        window.SpeechRecognition = class {
          continuous = true;
          interimResults = true;
          lang = 'en-US';
          onresult = null;
          onend = null;
          start() {
            setTimeout(() => {
              if (this.onresult) {
                this.onresult({
                  results: [[{ transcript: 'Hello world' }]]
                });
              }
              if (this.onend) this.onend();
            }, 100);
          }
          stop() {
            if (this.onend) this.onend();
          }
        };
        window.webkitSpeechRecognition = window.SpeechRecognition;
      `
        });

        const micButton = page.locator('button').filter({ has: page.locator('[data-slot="mic"]') });
        await micButton.click();

        // Check if input was filled
        const input = page.locator('textarea[placeholder*="Ask anything"]');
        await expect(input).toHaveValue('Hello world');
    });

    test('should export conversation', async ({ page }) => {
        // Send a message first
        const input = page.locator('textarea[placeholder*="Ask anything"]').first();
        await input.fill('Test message');
        await page.locator('button[type="button"]').filter({ hasText: 'Send' }).click();

        // Wait a bit
        await page.waitForTimeout(1000);

        // Open settings and export
        await page.locator('button').filter({ has: page.locator('[data-slot="settings"]') }).click();
        await page.locator('text=Export Conversation').click();

        // Check if download was triggered (this is hard to test directly)
        // In a real scenario, we'd mock the download
    });
});