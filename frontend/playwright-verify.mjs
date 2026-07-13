import { chromium } from 'playwright'
import fs from 'fs'

const evidencePath = '/Users/max_yang/Projects/food-website/.team/tasks/T-2026-0613-001/evidence'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  
  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        text: msg.text(),
        location: msg.location()
      })
    }
  })
  
  // Network capture
  const apiResponses = []
  page.on('response', async (response) => {
    const url = response.url()
    if (url.includes('/api/challenges')) {
      try {
        const body = await response.text()
        apiResponses.push({
          url,
          status: response.status(),
          body: body.substring(0, 500)
        })
      } catch (e) {}
    }
  })
  
  console.log('Navigating to /challenges...')
  await page.goto('http://39.103.68.205/challenges', { waitUntil: 'networkidle' })
  
  // Wait for React hydrate or content
  try {
    await page.waitForSelector('.challenges-grid, .empty', { timeout: 15000 })
  } catch (e) {
    console.log('Timeout waiting for selector, continuing...')
  }
  
  // Wait a bit more
  await page.waitForTimeout(3000)
  
  // Screenshot
  await page.screenshot({ 
    path: `${evidencePath}/playwright-challenges.png`, 
    fullPage: true 
  })
  console.log('Screenshot saved')
  
  // DOM analysis
  const domAnalysis = await page.evaluate(() => {
    const grid = document.querySelector('.challenges-grid')
    const empty = document.querySelector('.empty')
    
    return {
      hasChallengesGrid: !!grid,
      gridCardCount: grid ? grid.querySelectorAll('.challenge-card').length : 0,
      hasEmptyState: !!empty,
      emptyText: empty ? empty.textContent : null,
      htmlSnapshot: document.body.innerHTML.substring(0, 2000)
    }
  })
  
  console.log('DOM Analysis:', JSON.stringify(domAnalysis, null, 2))
  
  // Save V1 result
  const v1Result = {
    timestamp: new Date().toISOString(),
    domAnalysis,
    consoleErrors,
    apiResponses,
    pageUrl: page.url()
  }
  
  fs.writeFileSync(
    `${evidencePath}/v1-playwright.json`,
    JSON.stringify(v1Result, null, 2)
  )
  console.log('V1 JSON saved')
  
  await browser.close()
  
  console.log('\n=== SUMMARY ===')
  console.log('Empty state found:', domAnalysis.hasEmptyState)
  console.log('Empty text:', domAnalysis.emptyText)
  console.log('Grid found:', domAnalysis.hasChallengesGrid)
  console.log('Card count:', domAnalysis.gridCardCount)
  console.log('Console errors:', consoleErrors.length)
  if (consoleErrors.length > 0) console.log(JSON.stringify(consoleErrors, null, 2))
  console.log('API responses captured:', apiResponses.length)
  console.log('Network capture:', JSON.stringify(apiResponses, null, 2))
}

run().catch(console.error)
