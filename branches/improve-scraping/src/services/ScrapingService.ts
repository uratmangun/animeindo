import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { ProxyService } from './ProxyService';
import { RetryService } from './RetryService';

export interface ScrapingConfig {
  usePuppeteer: boolean;
  timeout: number;
  retries: number;
  delay: number;
  userAgent: string;
  proxy?: string;
}

export interface ScrapedAnimeData {
  title: string;
  slug: string;
  imageUrl: string;
  status: string;
  description?: string;
  genres: string[];
  episodes: ScrapedEpisodeData[];
  metadata: {
    originalUrl: string;
    scrapedAt: Date;
    source: string;
  };
}

export interface ScrapedEpisodeData {
  title: string;
  episodeNumber: number;
  imageUrl?: string;
  description?: string;
  airDate?: Date;
  duration?: number;
  downloadLinks: DownloadLink[];
}

export interface DownloadLink {
  quality: string;
  url: string;
  size?: string;
  format: string;
}

export class ScrapingService {
  private axiosInstance: AxiosInstance;
  private browser: Browser | null = null;
  private proxyService: ProxyService;
  private retryService: RetryService;
  private config: ScrapingConfig;

  constructor(config: Partial<ScrapingConfig> = {}) {
    this.config = {
      usePuppeteer: false,
      timeout: 30000,
      retries: 3,
      delay: 1000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...config
    };

    this.proxyService = new ProxyService();
    this.retryService = new RetryService(this.config.retries);

    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for proxy rotation
    this.axiosInstance.interceptors.request.use(async (config) => {
      if (this.config.proxy) {
        config.proxy = {
          host: this.config.proxy.split(':')[0],
          port: parseInt(this.config.proxy.split(':')[1])
        };
      }
      return config;
    });

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          // Rate limited, wait and retry
          await this.delay(5000);
          throw error;
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initialize Puppeteer browser
   */
  async initializeBrowser(): Promise<void> {
    if (this.config.usePuppeteer && !this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
  }

  /**
   * Scrape anime data from multiple pages
   */
  async scrapeAnimePages(pages: number[]): Promise<ScrapedAnimeData[]> {
    const results: ScrapedAnimeData[] = [];
    
    for (const page of pages) {
      try {
        logger.info(`Scraping page ${page}`);
        const pageData = await this.scrapeAnimePage(page);
        results.push(...pageData);
        
        // Add delay between requests
        await this.delay(this.config.delay);
      } catch (error) {
        logger.error(`Error scraping page ${page}:`, error);
        // Continue with next page
      }
    }
    
    return results;
  }

  /**
   * Scrape single anime page
   */
  async scrapeAnimePage(page: number): Promise<ScrapedAnimeData[]> {
    const url = `http://animeindo.web.id/page/${page}/`;
    
    return this.retryService.execute(async () => {
      if (this.config.usePuppeteer) {
        return this.scrapeWithPuppeteer(url);
      } else {
        return this.scrapeWithCheerio(url);
      }
    });
  }

  /**
   * Scrape using Cheerio (faster, for static content)
   */
  private async scrapeWithCheerio(url: string): Promise<ScrapedAnimeData[]> {
    const response = await this.axiosInstance.get(url);
    const $ = cheerio.load(response.data);
    const animeList: ScrapedAnimeData[] = [];

    $('#episodes .episode').each((index, element) => {
      try {
        const anime = this.extractAnimeData($, $(element), url);
        if (anime) {
          animeList.push(anime);
        }
      } catch (error) {
        logger.error(`Error extracting anime data at index ${index}:`, error);
      }
    });

    return animeList;
  }

  /**
   * Scrape using Puppeteer (for JavaScript-heavy sites)
   */
  private async scrapeWithPuppeteer(url: string): Promise<ScrapedAnimeData[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    try {
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(this.config.userAgent);
      
      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Wait for content to load
      await page.waitForSelector('#episodes .episode', { timeout: 10000 });
      
      // Extract data
      const animeList = await page.evaluate(() => {
        const episodes = document.querySelectorAll('#episodes .episode');
        const results: any[] = [];
        
        episodes.forEach((episode) => {
          try {
            const imageElement = episode.querySelector('.episode-image img');
            const titleElement = episode.querySelector('.episode-details h3 a');
            const statusElement = episode.querySelector('.mirror-sub');
            const timeElement = episode.querySelector('.episode-meta');
            
            if (titleElement && imageElement) {
              results.push({
                title: titleElement.textContent?.trim() || '',
                imageUrl: imageElement.getAttribute('src') || '',
                status: statusElement?.textContent?.trim() || '',
                time: timeElement?.textContent?.trim() || ''
              });
            }
          } catch (error) {
            console.error('Error extracting episode data:', error);
          }
        });
        
        return results;
      });
      
      return animeList.map((item, index) => ({
        title: item.title,
        slug: this.generateSlug(item.title),
        imageUrl: item.imageUrl,
        status: this.parseStatus(item.status),
        description: '',
        genres: [],
        episodes: [],
        metadata: {
          originalUrl: url,
          scrapedAt: new Date(),
          source: 'animeindo'
        }
      }));
      
    } finally {
      await page.close();
    }
  }

  /**
   * Extract anime data from Cheerio element
   */
  private extractAnimeData($: cheerio.CheerioAPI, element: cheerio.Cheerio<cheerio.Element>, baseUrl: string): ScrapedAnimeData | null {
    try {
      const imageElement = element.find('.episode-image img');
      const titleElement = element.find('.episode-details h3 a');
      const statusElement = element.find('.mirror-sub');
      const timeElement = element.find('.episode-meta');
      
      const title = titleElement.text().trim();
      const imageUrl = imageElement.attr('src') || '';
      const status = statusElement.text().trim();
      const time = timeElement.text().trim();
      
      if (!title || !imageUrl) {
        return null;
      }
      
      return {
        title,
        slug: this.generateSlug(title),
        imageUrl,
        status: this.parseStatus(status),
        description: '',
        genres: [],
        episodes: [],
        metadata: {
          originalUrl: baseUrl,
          scrapedAt: new Date(),
          source: 'animeindo'
        }
      };
    } catch (error) {
      logger.error('Error extracting anime data:', error);
      return null;
    }
  }

  /**
   * Generate URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Parse status from scraped text
   */
  private parseStatus(statusText: string): string {
    const status = statusText.toLowerCase();
    if (status.includes('ongoing') || status.includes('berlangsung')) {
      return 'ongoing';
    } else if (status.includes('completed') || status.includes('selesai')) {
      return 'completed';
    } else if (status.includes('upcoming') || status.includes('akan datang')) {
      return 'upcoming';
    }
    return 'ongoing';
  }

  /**
   * Add delay between requests
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close browser and cleanup
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Update scraping configuration
   */
  updateConfig(newConfig: Partial<ScrapingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current scraping statistics
   */
  getStats(): { config: ScrapingConfig; browserActive: boolean } {
    return {
      config: this.config,
      browserActive: this.browser !== null
    };
  }
}
